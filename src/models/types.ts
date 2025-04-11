/**
 * Represents a URL with metadata
 */
export interface CrawledUrl {
  /** The URL that was crawled */
  url: string;
  /** The depth at which this URL was found */
  depth: number;
  /** Whether this URL is a product URL */
  isProductUrl: boolean;
  /** The parent URL that led to this URL */
  parentUrl?: string;
  /** When this URL was crawled */
  crawledAt?: Date;
}

/**
 * Represents the result of a crawl operation
 */
export interface CrawlResult {
  /** The domain that was crawled */
  domain: string;
  /** All product URLs found */
  productUrls: string[];
  /** Total number of URLs crawled */
  totalUrlsCrawled: number;
  /** When the crawl started */
  startTime: Date;
  /** When the crawl ended */
  endTime: Date;
  /** Duration of the crawl in milliseconds */
  duration: number;
}

/**
 * Represents a queue item for crawling
 */
export interface CrawlQueueItem {
  /** The URL to crawl */
  url: string;
  /** The depth of this URL in the crawl */
  depth: number;
  /** The parent URL that led to this URL */
  parentUrl?: string;
}

/**
 * Represents a pattern for identifying product URLs
 */
export interface ProductUrlPattern {
  /** Regular expression pattern to match against URLs */
  pattern: RegExp;
  /** Description of this pattern */
  description: string;
}
