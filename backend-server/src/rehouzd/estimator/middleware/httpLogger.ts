import morgan from 'morgan';
import logger from '../utils/logger';

// Create a custom token format for Morgan
const morganFormat = ':remote-addr :method :url :status :res[content-length] - :response-time ms';

// Create a stream object with a write function for Morgan
const stream = {
  write: (message: string) => {
    // Remove newline characters from the message
    const trimmedMessage = message.trim();
    logger.http(trimmedMessage);
  },
};

// Export the Morgan middleware
const httpLogger = morgan(morganFormat, { stream });

export default httpLogger; 