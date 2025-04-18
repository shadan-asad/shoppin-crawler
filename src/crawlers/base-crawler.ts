import puppeteer, { Browser, Page } from 'puppeteer';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { CrawlerConfig, defaultConfig } from '../config/config';
import logger from '../utils/logger';
import { CrawlQueueItem, CrawlResult, CrawledUrl, ProductUrlPattern } from '../models/types';
import { 
  normalizeUrl, 
  isSameDomain, 
  resolveUrl, 
  isLikelyProductUrl,
  commonProductUrlPatterns
} from '../utils/url-utils';
import fs from 'fs';
import path from 'path';


export abstract class BaseCrawler {
  protected domain: string;
  protected config: CrawlerConfig;
  protected visitedUrls: Set<string> = new Set();
  protected productUrls: Set<string> = new Set();
  protected urlQueue: CrawlQueueItem[] = [];
  protected browser: Browser | null = null;
  protected productUrlPatterns: ProductUrlPattern[] = commonProductUrlPatterns;
  protected startTime: Date | null = null;
  protected endTime: Date | null = null;

  
  constructor(domain: string, config: CrawlerConfig = defaultConfig) {
    this.domain = domain;
    this.config = config;
    
    // Add domain-specific product URL patterns
    this.initializeProductUrlPatterns();
  }

  /**
   * Initialize domain-specific product URL patterns
   * This method should be overridden by subclasses to add domain-specific patterns
   */
  protected abstract initializeProductUrlPatterns(): void;

  protected isProductUrl(url: string): boolean {
    // Check against all patterns
    return this.productUrlPatterns.some(({ pattern }) => pattern.test(url));
  }

  public async start(): Promise<CrawlResult> {
    this.startTime = new Date();
    logger.info(`Starting crawler for domain: ${this.domain}`);

    // Initialize the queue with the domain URL
    this.urlQueue.push({ url: this.domain, depth: 0 });

    // Initialize browser if needed
    if (this.config.useHeadlessBrowser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    try {
      // Process the queue
      await this.processQueue();
      
      // Save results
      const result = this.saveResults();
      
      return result;
    } finally {
      // Close browser if it was opened
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }
  }

  
  private async processQueue(): Promise<void> {
    const promises: Promise<void>[] = [];
    const maxUrlsToCrawl = 200; // Set the maximum number of URLs to crawl

    while (this.urlQueue.length > 0 && this.visitedUrls.size < maxUrlsToCrawl) {
      const batch = this.urlQueue.splice(0, this.config.concurrency);

      for (const item of batch) {
        const normalizedUrl = normalizeUrl(item.url);
        if (this.visitedUrls.has(normalizedUrl)) {
          continue;
        }

        this.visitedUrls.add(normalizedUrl);

        const promise = this.processUrl(item).catch(error => {
          logger.error(`Error processing URL ${item.url}: ${error.message}`);
        });

        promises.push(promise);
      }

      await Promise.all(promises);
      promises.length = 0;

      if (this.urlQueue.length > 0 && this.config.requestDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.config.requestDelay));
      }
    }
  }

  private async processUrl(item: CrawlQueueItem): Promise<void> {
    const { url, depth } = item;
    
    logger.debug(`Processing URL: ${url} (depth: ${depth})`);
    
    // Check if this is a product URL
    if (this.isProductUrl(url)) {
      logger.info(`Found product URL: ${url}`);
      this.productUrls.add(url);
    } else {
      logger.debug(`Not a product URL: ${url}`);
    }
    
    // Stop if we've reached the maximum depth
    if (depth >= this.config.maxDepth) {
      return;
    }
    
    // Fetch the page content
    let links: string[] = [];
    
    if (this.config.useHeadlessBrowser) {
      links = await this.fetchLinksWithBrowser(url);
    } else {
      links = await this.fetchLinksWithAxios(url);
    }
    
    // Process the links
    for (const link of links) {
      // Resolve relative URLs
      const absoluteUrl = resolveUrl(link, url);
      
      // Skip if not from the same domain
      if (!isSameDomain(absoluteUrl, this.domain)) {
        continue;
      }
      
      // Normalize the URL
      const normalizedUrl = normalizeUrl(absoluteUrl);
      
      // Skip if we've already visited or queued this URL
      if (this.visitedUrls.has(normalizedUrl)) {
        continue;
      }
      
      // Add to the queue
      this.urlQueue.push({
        url: normalizedUrl,
        depth: depth + 1,
        parentUrl: url
      });
    }
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
      
      // Extract links
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
    
    try {
      const page = await this.browser.newPage();
      
      // Set user agent
      await page.setUserAgent(this.config.userAgent);
      
      // Set timeout
      page.setDefaultTimeout(this.config.timeout);
      
      // Navigate to the URL
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      // Extract links
      const links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        return anchors.map(anchor => anchor.href).filter(href => href);
      });
      
      await page.close();
      
      return links;
    } catch (error) {
      logger.error(`Error fetching ${url} with Puppeteer: ${error}`);
      return [];
    }
  }

  
  private saveResults(): CrawlResult {
    this.endTime = new Date();
    
    // Create the output directory if it doesn't exist
    if (!fs.existsSync(this.config.outputPath)) {
      fs.mkdirSync(this.config.outputPath, { recursive: true });
    }
    
    // Extract the domain name for the filename
    const domainName = new URL(this.domain).hostname.replace(/\./g, '_');
    const outputFile = path.join(this.config.outputPath, `${domainName}.json`);
    
    // Create the result object
    const result: CrawlResult = {
      domain: this.domain,
      productUrls: Array.from(this.productUrls),
      totalUrlsCrawled: this.visitedUrls.size,
      startTime: this.startTime!,
      endTime: this.endTime,
      duration: this.endTime.getTime() - this.startTime!.getTime()
    };
    
    // Write the result to a file
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    
    logger.info(`Crawler finished for domain: ${this.domain}`);
    logger.info(`Found ${result.productUrls.length} product URLs`);
    logger.info(`Crawled ${result.totalUrlsCrawled} URLs in ${result.duration}ms`);
    logger.info(`Results saved to ${outputFile}`);
    
    return result;
  }
}
