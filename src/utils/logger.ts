import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'crawler.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for error logs
    new winston.transports.File({
      level: 'error',
      filename: path.join(logsDir, 'error.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

export default logger;
