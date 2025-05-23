export interface CrawledUrl {
  // The URL that was crawled
  url: string;
  // The depth at which this URL was found
  depth: number;
  // Whether this URL is a product URL
  isProductUrl: boolean;
  // The parent URL that led to this URL
  parentUrl?: string;
  // When this URL was crawled
  crawledAt?: Date;
}

// rsult of a crawl operation
export interface CrawlState {
  // The last successfully crawled URL
  lastSuccessfulUrl: string;
  // The last error encountered during crawling
  lastError: Error | null;
  // The number of blocked requests
  blockedCount: number;
  // The number of rate limit hits
  rateLimitHits: number;
  // The number of network errors
  networkErrors: number;
  // The number of timeout errors
  timeoutErrors: number;
}

export interface CrawlResult {
  // The domain that was crawled
  domain: string;
  // All product URLs found
  productUrls: string[];
  // Total number of URLs crawled
  totalUrlsCrawled: number;
  // When the crawl started
  startTime: Date;
  // When the crawl ended
  endTime: Date;
  // Duration of the crawl in milliseconds
  duration: number;
  // State information about the crawl
  crawlState?: CrawlState;
}

// Represents a queue item for crawling
export interface CrawlQueueItem {
  // The URL to crawl
  url: string;
  // The depth of this URL in the crawl
  depth: number;
  // The parent URL that led to this URL
  parentUrl?: string;
}

// Represents a pattern for identifying product URLs
export interface ProductUrlPattern {
  // Regular expression pattern to match against URLs
  pattern: RegExp;
  // Description of this pattern
  description: string;
  // Priority of this pattern
  priority: number;
}
