export interface CrawlerConfig {
  //Maximum number of concurrent requests
  concurrency: number;
  // Maximum depth to crawl
  maxDepth: number;
  // Delay between requests in milliseconds
  requestDelay: number;
  // User agent to use for requests
  userAgent: string;
  // Timeout for requests in milliseconds
  timeout: number;
  // Output file path
  outputPath: string;
  // Whether to use headless browser
  useHeadlessBrowser: boolean;
}

export const defaultConfig: CrawlerConfig = {
  concurrency: 1, // Keep concurrency low to avoid rate limiting
  maxDepth: 3,    // Increased depth to find more product pages
  requestDelay: 2000, // Increased delay to avoid rate limiting
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  timeout: 30000,  // Increased timeout for slower sites
  outputPath: './output',
  useHeadlessBrowser: true,
};

// Start with less aggressive sites first
export const domains = [
  'https://nykaafashion.com/',
  'https://www.westside.com/',
  'https://www.virgio.com/',



















  









  'https://www.tatacliq.com/'
];

export default {
  defaultConfig,
  domains
};
   