import { URL } from 'url';

// Normalizes a URL by removing trailing slashes, query parameters, etc.
export function normalizeUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    
    // Convert to lowercase
    let normalized = parsedUrl.toString().toLowerCase();
    
    // Remove trailing slash if present
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    
    return normalized;
  } catch (error) {
    // If URL parsing fails, return the original URL
    return url;
  }
}

// Checks if a URL belongs to the same domain as the base URL
export function isSameDomain(url: string, baseDomain: string): boolean {
  try {
    const urlDomain = new URL(url).hostname;
    const baseHostname = new URL(baseDomain).hostname;
    
    return urlDomain === baseHostname;
  } catch (error) {
    return false;
  }
}

// Resolves a relative URL to an absolute URL
export function resolveUrl(relativeUrl: string, baseUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).toString();
  } catch (error) {
    return relativeUrl;
  }
}


export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch (error) {
    return '';
  }
}

// Common patterns for product URLs across e-commerce sites
export const commonProductUrlPatterns = [
  { pattern: /\/product\//, description: 'URL contains /product/' },
  { pattern: /\/products\//, description: 'URL contains /products/' },
  { pattern: /\/item\//, description: 'URL contains /item/' },
  { pattern: /\/p\//, description: 'URL contains /p/' },
  { pattern: /\/pd\//, description: 'URL contains /pd/' },
  { pattern: /\/shop\//, description: 'URL contains /shop/' },
  { pattern: /-p-\d+/, description: 'URL contains -p- followed by digits' },
  { pattern: /\/dp\/[A-Z0-9]{10}/, description: 'URL contains /dp/ followed by 10 alphanumeric characters (Amazon style)' },
];


export function isLikelyProductUrl(url: string): boolean {
  return commonProductUrlPatterns.some(({ pattern }) => pattern.test(url));
}
