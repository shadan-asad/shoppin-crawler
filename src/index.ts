import { BaseCrawler } from './crawlers/base-crawler';
import { defaultConfig, domains } from './config/config';
import logger from './utils/logger';
import fs from 'fs';
import path from 'path';

async function runCrawlerForDomain(domain: string) {
  const crawler = new BaseCrawler(domain, defaultConfig);

  try {
    const result = await crawler.start();
    logger.info(`Crawl completed for ${domain}: ${JSON.stringify(result, null, 2)}`);

    // Save the product URLs to a separate file
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