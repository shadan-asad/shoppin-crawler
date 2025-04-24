import puppeteer, { Browser, Page } from 'puppeteer';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { CrawlerConfig, defaultConfig } from '../config/config';
import logger from '../utils/logger';
import { CrawlQueueItem, CrawlResult, CrawledUrl } from '../models/types';
import { 
  normalizeUrl, 
  isSameDomain, 
  resolveUrl, 
  isProductUrl
} from '../utils/url-utils';
import fs from 'fs';
import path from 'path';

export class BaseCrawler {
  protected domain: string;
  protected config: CrawlerConfig;
  protected visitedUrls: Set<string> = new Set();
  protected productUrls: Set<string> = new Set();
  protected urlQueue: CrawlQueueItem[] = [];
  protected browser: Browser | null = null;
  protected startTime: Date | null = null;
  protected endTime: Date | null = null;
  protected maxUrlsToCrawl = 100;

  private crawlState = {
    lastSuccessfulUrl: '',
    lastError: null as Error | null,
    blockedCount: 0,
    rateLimitHits: 0,
    networkErrors: 0,
    timeoutErrors: 0
  };

  constructor(domain: string, config: CrawlerConfig = defaultConfig) {
    this.domain = domain;
    this.config = config;
  }

  protected isProductUrl(url: string): boolean {
    return isProductUrl(url);
  }

  public async start(): Promise<CrawlResult> {
    this.startTime = new Date();
    logger.info(`Starting crawler for domain: ${this.domain}`);

    // Initialize the queue with the domain URL
    this.urlQueue.push({ url: this.domain, depth: 0 });

    try {
      // Initialize browser with retries if needed
      if (this.config.useHeadlessBrowser) {
        await this.initializeBrowser();
      }

      await this.processQueue();
      return this.saveResults();
    } finally {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }
  }

  private async initializeBrowser(): Promise<void> {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        this.browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--window-size=1920,1080',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
          ],
          defaultViewport: {
            width: 1920,
            height: 1080
          }
        });
        break;
      } catch (error) {
        retryCount++;
        if (retryCount === maxRetries) {
          throw error;
        }
        logger.warn(`Browser launch failed, retrying (${retryCount}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  }

  private saveResults(): CrawlResult {
    this.endTime = new Date();
    
    if (!fs.existsSync(this.config.outputPath)) {
      fs.mkdirSync(this.config.outputPath, { recursive: true });
    }
    
    const domainName = new URL(this.domain).hostname.replace(/\./g, '_');
    const outputFile = path.join(this.config.outputPath, `${domainName}.json`);
    
    const result: CrawlResult = {
      domain: this.domain,
      productUrls: Array.from(this.productUrls),
      totalUrlsCrawled: this.visitedUrls.size,
      startTime: this.startTime!,
      endTime: this.endTime,
      duration: this.endTime.getTime() - this.startTime!.getTime(),
      crawlState: this.crawlState
    };
    
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    
    this.logCrawlResults(result);
    
    return result;
  }

  private logCrawlResults(result: CrawlResult): void {
    logger.info(`Crawler finished for domain: ${this.domain}`);
    logger.info(`Found ${result.productUrls.length} product URLs`);
    logger.info(`Crawled ${result.totalUrlsCrawled} URLs in ${result.duration}ms`);
    
    if (result.totalUrlsCrawled < this.maxUrlsToCrawl) {
      logger.warn(`Crawler stopped early. Check crawlState for details: ${JSON.stringify(this.crawlState)}`);
    }
  }

  private async processQueue(): Promise<void> {
    const promises: Promise<void>[] = [];
    const maxTimeoutErrors = 10;
    const maxNetworkErrors = 8;
    const maxBlockedCount = 5;

    while (this.urlQueue.length > 0 && this.visitedUrls.size < this.maxUrlsToCrawl) {
      if (this.shouldStopCrawling(maxTimeoutErrors, maxNetworkErrors, maxBlockedCount)) {
        break;
      }

      const batch = this.urlQueue.splice(0, this.config.concurrency);
      promises.length = 0;

      for (const item of batch) {
        const normalizedUrl = normalizeUrl(item.url);
        if (this.visitedUrls.has(normalizedUrl)) continue;

        this.visitedUrls.add(normalizedUrl);
        promises.push(this.processUrl(item).catch(error => {
          this.handleCrawlError(error, item.url);
        }));
      }

      await Promise.all(promises);

      if (this.urlQueue.length > 0 && this.config.requestDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.config.requestDelay));
      }
    }
  }

  private shouldStopCrawling(maxTimeoutErrors: number, maxNetworkErrors: number, maxBlockedCount: number): boolean {
    if (this.crawlState.networkErrors >= maxNetworkErrors) {
      logger.error(`Crawler stopped early: Network errors. State: ${JSON.stringify(this.crawlState)}`);
      return true;
    }
    if (this.crawlState.timeoutErrors >= maxTimeoutErrors) {
      logger.error(`Crawler stopped early: Timeout errors. State: ${JSON.stringify(this.crawlState)}`);
      return true;
    }
    if (this.crawlState.blockedCount >= maxBlockedCount) {
      logger.error(`Crawler stopped early: Bot detection/blocking. State: ${JSON.stringify(this.crawlState)}`);
      return true;
    }
    return false;
  }

  private async processUrl(item: CrawlQueueItem, retryCount = 0): Promise<void> {
    const { url, depth } = item;
    const maxRetries = 2;
    
    try {
      if (this.isProductUrl(url)) {
        logger.info(`Found product URL: ${url}`);
        this.productUrls.add(url);
      }
      
      if (depth >= this.config.maxDepth) return;
      
      const links = await this.fetchLinks(url);
      this.processLinks(links, url, depth);
      
    } catch (error: any) {
      if (this.shouldRetry(error, retryCount, maxRetries)) {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.processUrl(item, retryCount + 1);
      }
      throw error;
    }
  }

  private shouldRetry(error: any, retryCount: number, maxRetries: number): boolean {
    return error.message?.includes('timeout') && retryCount < maxRetries;
  }

  private processLinks(links: string[], sourceUrl: string, depth: number): void {
    for (const link of links) {
      try {
        const absoluteUrl = resolveUrl(link, sourceUrl);
        if (!isSameDomain(absoluteUrl, this.domain)) continue;
        
        const normalizedUrl = normalizeUrl(absoluteUrl);
        if (this.visitedUrls.has(normalizedUrl)) continue;
        
        this.urlQueue.push({
          url: normalizedUrl,
          depth: depth + 1,
          parentUrl: sourceUrl
        });
      } catch (error) {
        logger.debug(`Error processing link ${link}: ${error}`);
      }
    }
  }

  private async fetchLinks(url: string): Promise<string[]> {
    return this.config.useHeadlessBrowser ? 
      this.fetchLinksWithBrowser(url) : 
      this.fetchLinksWithAxios(url);
  }

  private async fetchLinksWithAxios(url: string): Promise<string[]> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.config.userAgent
        },
        timeout: this.config.timeout
      });
      
      const $ = cheerio.load(response.data);
      const links: string[] = [];
      
      $('a').each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
          links.push(href);
        }
      });
      
      return links;
    } catch (error) {
      logger.error(`Error fetching ${url} with Axios: ${error}`);
      return [];
    }
  }

  private async fetchLinksWithBrowser(url: string): Promise<string[]> {
    if (!this.browser) {
      return [];
    }
    
    let page: Page | null = null;
    try {
      page = await this.browser.newPage();
      logger.debug(`Created new page for ${url}`);
      
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        if (resourceType === 'document' || resourceType === 'script' || resourceType === 'xhr' || resourceType === 'fetch') {
          request.continue();
        } else {
          request.abort();
        }
      });

      page.on('console', msg => logger.debug(`Browser console: ${msg.text()}`));
      page.on('pageerror', err => logger.debug(`Page error: ${err.message}`));

      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(this.config.userAgent);
      
      logger.debug(`Navigating to ${url}`);
      await page.goto(url, { 
        waitUntil: ['domcontentloaded', 'networkidle0'],
        timeout: 30000 
      });
      logger.debug(`Initial page load complete for ${url}`);

      await page.waitForFunction(() => {
        return document.readyState === 'complete' && 
               !!document.querySelector('a') &&
               document.querySelectorAll('a[href]').length > 0;
      }, { timeout: 10000 }).catch(() => {
        logger.warn(`Timed out waiting for links on ${url}, continuing anyway`);
      });

      const links = await page.evaluate(() => {
        const results = new Set<string>();
        
        document.querySelectorAll('a[href]').forEach(el => {
          const href = el.getAttribute('href');
          if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
            results.add(href);
          }
        });
        
        const dataAttrs = ['data-url', 'data-href', 'data-link', 'data-product-url'];
        document.querySelectorAll(`[${dataAttrs.join('], [')}]`).forEach(el => {
          dataAttrs.forEach(attr => {
            const value = el.getAttribute(attr);
            if (value) results.add(value);
          });
        });
        
        document.querySelectorAll('[onclick]').forEach(el => {
          const onclick = el.getAttribute('onclick');
          if (onclick && onclick.includes('window.location')) {
            const match = onclick.match(/window\.location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/);
            if (match) results.add(match[1]);
          }
        });

        return Array.from(results);
      });

      logger.debug(`Found ${links.length} raw links on ${url}`);
      
      const processedLinks = links
        .map(link => {
          try {
            return new URL(link, url).toString();
          } catch {
            return null;
          }
        })
        .filter((link): link is string => 
          link !== null && 
          link.startsWith('http') && 
          !link.includes('undefined')
        );

      logger.info(`Found ${processedLinks.length} valid links on ${url}`);
      this.crawlState.lastSuccessfulUrl = url;
      
      await page.close();
      return processedLinks;
      
    } catch (error) {
      logger.error(`Error processing ${url}: ${error}`);
      if (page) await page.close();
      throw error;
    }
  }

  private handleCrawlError(error: Error, url: string): void {
    this.crawlState.lastError = error;
    
    if (error.message?.includes('timeout')) {
      this.crawlState.timeoutErrors++;
      logger.warn(`Timeout error for ${url}. Total timeouts: ${this.crawlState.timeoutErrors}`);
    } else if (error.message?.includes('net::')) {
      this.crawlState.networkErrors++;
      logger.warn(`Network error for ${url}. Total network errors: ${this.crawlState.networkErrors}`);
    } else if (error.message?.includes('blocked') || error.message?.includes('forbidden') || error.message?.includes('429')) {
      this.crawlState.blockedCount++;
      logger.warn(`Access blocked for ${url}. Total blocks: ${this.crawlState.blockedCount}`);
    }

    logger.error(`Error processing URL ${url}: ${error.message}`);
  }
}
