import winston, { format } from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'production' ? 'info' : 'debug';
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Custom format for production (no colors, container-friendly)
const customFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  format.errors({ stack: true }),
  format.printf((info: winston.Logform.TransformableInfo) => {
    let message = `${info.timestamp} ${info.level.toUpperCase()}: ${info.message}`;
    
    // Add stack trace if available
    if (info.stack) {
      message += `\n${info.stack}`;
    }
    
    // Add metadata if present
    if (info.metadata && Object.keys(info.metadata).length > 0) {
      message += ` ${JSON.stringify(info.metadata)}`;
    }
    
    return message;
  })
);

// Console format with colors
const consoleFormat = format.combine(
  format.colorize({ all: true }),
  customFormat
);

// Define transports based on environment
const transports = [];

// Always add console transport, but configure differently for production containers
if (process.env.NODE_ENV === 'production') {
  // In production containers (Azure), use simple format without colors and write directly to stdout
  transports.push(new winston.transports.Console({
    format: customFormat, // No colors for container logs
    handleExceptions: true,
    handleRejections: true,
  }));
} else {
  // In development, use colored console output
  transports.push(new winston.transports.Console({
    format: consoleFormat,
    handleExceptions: true,
    handleRejections: true,
  }));
  
  // In development, also add file transports
  transports.push(
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      format: customFormat,
    }),
    new winston.transports.File({
      filename: path.join('logs', 'all.log'),
      format: customFormat,
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format: format.combine(
    format.errors({ stack: true }),
    format.metadata(),
    customFormat
  ),
  transports,
  exitOnError: false,
});

export default logger; 