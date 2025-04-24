# Shoppin-Crawler

A robust, scalable web crawler designed to extract product URLs from e-commerce websites. Built with TypeScript, using modern web scraping techniques and supporting multiple e-commerce platforms.

## Features

- Generic product URL pattern matching
- Multi-platform support
- Configurable crawling parameters
- Robust error handling and retry mechanisms
- Rate limiting and bot detection avoidance
- Headless browser support with Puppeteer
- Concurrent request handling
- Detailed logging and monitoring
- Output file generation in JSON format

## Prerequisites

- Node.js (v14 or higher)
- TypeScript
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/shadan-asad/shoppin-crawler.git
cd shoppin-crawler
```

2. Install dependencies:
```bash
npm install
```

## Configuration

The crawler can be configured through the `src/config/config.ts` file:

- `concurrency`: Number of concurrent requests (default: 1)
- `maxDepth`: Maximum crawl depth (default: 3)
- `requestDelay`: Delay between requests in ms (default: 2000)
- `timeout`: Request timeout in ms (default: 30000)
- `outputPath`: Path for output files (default: './output')
- `useHeadlessBrowser`: Whether to use Puppeteer (default: true)

## Usage

1. Start the crawler:
```bash
npm start
```

2. For development with auto-reload:
```bash
npm run dev
```

3. Build the project:
```bash
npm run build
```

## Output

The crawler generates two types of output files in the `output` directory:
1. Domain-specific JSON files (e.g., `www_amazon_com.json`) containing:
   - Domain information
   - Total URLs crawled
   - Crawl duration
   - Crawl state and errors

2. Product URL files (e.g., `www.amazon.com_product_urls.json`) containing:
   - List of discovered product URLs

## Project Structure

```
shoppin-crawler/
├── src/
│   ├── config/
│   │   └── config.ts         # Configuration settings
│   ├── crawlers/
│   │   └── base-crawler.ts   # Core crawler implementation
│   ├── models/
│   │   └── types.ts         # TypeScript type definitions
│   ├── utils/
│   │   ├── logger.ts        # Logging utility
│   │   └── url-utils.ts     # URL handling utilities
│   └── index.ts             # Main entry point
├── logs/                    # Log files directory
├── output/                  # Crawler output directory
├── package.json
├── tsconfig.json
└── README.md
```

## Features in Detail

### Product URL Detection
- Pattern-based URL matching
- Common product identifiers recognition
- Priority-based pattern matching
- Support for various e-commerce URL formats

### Error Handling
- Automatic retry on timeouts
- Network error handling
- Rate limit detection
- Bot detection avoidance
- Detailed error logging

### Performance
- Configurable concurrency
- Request rate limiting
- Resource optimization
- Memory efficient URL storage

## Logging

Logs are stored in the `logs` directory:
- `crawler.log`: General crawler operations
- `error.log`: Error-specific logging

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the ISC License - see the LICENSE file for details.