import { URL } from 'url';
import { ProductUrlPattern } from '../models/types';

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

export const commonProductUrlPatterns: ProductUrlPattern[] = [
  {
    pattern: /\/p(roducts?)\/[\w-]+/i,
    description: "Generic product URL with /product/ or /products/ prefix",
    priority: 1
  },
  {
    pattern: /\/item(s)?\/[\w-]+/i,
    description: "Generic item URL with /item/ or /items/ prefix", 
    priority: 1
  },
  {
    pattern: /\/dp\/[A-Z0-9]{10}/i,
    description: "Amazon-style product URLs with /dp/ prefix",
    priority: 1
  },
  {
    pattern: /\/([\w-]+)\/[\w-]+-p-\d+/i,
    description: "Generic product URL with p- prefix and ID",
    priority: 1
  },
  {
    pattern: /\/c(ategory)?\/[\w-]+/i,
    description: "Category pages with /category/ prefix",
    priority: 0.5
  },
  {
    pattern: /\/([\w-]+)\/([\w-]+)\/[\w-]+$/i,
    description: "Three-level deep product URLs",
    priority: 0.4
  }
];

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isProductUrl(url: string, patterns: ProductUrlPattern[] = commonProductUrlPatterns): boolean {
  if (!isValidUrl(url)) return false;
  
  // Generic product identifiers
  const productIdentifiers = [
    'product',
    'item',
    'pd', 
    'details',
    'buy'
  ];

  const urlObj = new URL(url);
  const path = urlObj.pathname.toLowerCase();

  // Check if URL contains common product identifiers
  if (productIdentifiers.some(id => path.includes(id))) {
    return true;
  }

  // Check against patterns
  return patterns.some(p => p.pattern.test(path));
}

export function cleanUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove tracking and analytics params
    const cleanParams = new URLSearchParams();
    for (const [key, value] of urlObj.searchParams.entries()) {
      if (!isTrackingParam(key)) {
        cleanParams.append(key, value);
      }
    }
    urlObj.search = cleanParams.toString();
    return urlObj.toString();
  } catch {
    return url;
  }
}

function isTrackingParam(param: string): boolean {
  const trackingParams = [
    'utm_',
    'ref',
    'affiliate',
    'track',
    'source',
    'campaign',
    'medium',
    'mc_',
    '_ga',
    'fbclid',
    'gclid',
    'msclkid',
    'zanpid',
    'cid',
    'sid'
  ];
  return trackingParams.some(p => param.toLowerCase().includes(p));
}
