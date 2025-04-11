/**
 * Configuration settings for the crawler
 */
export interface CrawlerConfig {
  /** Maximum number of concurrent requests */
  concurrency: number;
  /** Maximum depth to crawl */
  maxDepth: number;
  /** Delay between requests in milliseconds */
  requestDelay: number;
  /** User agent to use for requests */
  userAgent: string;
  /** Timeout for requests in milliseconds */
  timeout: number;
  /** Output file path */
  outputPath: string;
  /** Whether to use headless browser */
  useHeadlessBrowser: boolean;
}

export const defaultConfig: CrawlerConfig = {
  concurrency: 5,
  maxDepth: 5,
  requestDelay: 1000,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  timeout: 30000,
  outputPath: './output',
  useHeadlessBrowser: true,
};

export const domains = [
  'https://www.virgio.com/',
  'https://www.tatacliq.com/',
  'https://nykaafashion.com/',
  'https://www.westside.com/'
];

export default {
  defaultConfig,
  domains
};
