import { BaseCrawler } from './crawlers/base-crawler';
import { defaultConfig, domains } from './config/config';
import logger from './utils/logger';
import fs from 'fs';
import path from 'path';
import { commonProductUrlPatterns } from './utils/url-utils';

class EcommerceCrawler extends BaseCrawler {
  protected initializeProductUrlPatterns(): void {
    // Use common patterns from url-utils
    this.productUrlPatterns = [...commonProductUrlPatterns];

    // Add domain-specific patterns
    if (this.domain.includes('tatacliq.com')) {
      this.productUrlPatterns.push({ pattern: /\/product\//, description: 'TataCliq product URL' });
    }
    if (this.domain.includes('nykaafashion.com')) {
      this.productUrlPatterns.push({ pattern: /\/p\//, description: 'Nykaa Fashion product URL' });
    }
    if (this.domain.includes('westside.com')) {
      this.productUrlPatterns.push({ pattern: /\/shop\//, description: 'Westside product URL' });
    }
  }
}

async function runCrawlerForDomain(domain: string) {
  const crawler = new EcommerceCrawler(domain, defaultConfig);

  try {
    const result = await crawler.start();
    logger.info(`Crawl completed for ${domain}: ${JSON.stringify(result, null, 2)}`);

    // Save the result to a file
    const outputFilePath = path.join(defaultConfig.outputPath, `${new URL(domain).hostname}_product_urls.json`);
    fs.writeFileSync(outputFilePath, JSON.stringify(result.productUrls, null, 2));
    logger.info(`Product URLs saved to ${outputFilePath}`);
  } catch (error: any) {
    logger.error(`Crawl failed for ${domain}: ${error.message}`);
  }
}

async function main() {
  for (const domain of domains) {
    await runCrawlerForDomain(domain);
  }
}

main(); 