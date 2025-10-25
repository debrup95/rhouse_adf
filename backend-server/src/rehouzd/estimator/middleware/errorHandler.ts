import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Custom error class
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Send error response based on environment
const sendErrorResponse = (err: AppError, req: Request, res: Response) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }
  
  // Programming or unknown error: don't leak error details
  // Log the error for developers
  logger.error(`CRITICAL ERROR: ${err.message}`, { 
    stack: err.stack,
    url: req.originalUrl 
  });
  
  // Send generic message to client
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong',
  });
};

// Error handling middleware
export const errorHandler = (err: Error | AppError, req: Request, res: Response, next: NextFunction) => {
  let error = err;
  
  // If it's not our custom error, convert it
  if (!(error instanceof AppError)) {
    const statusCode = (error as any)?.statusCode || 500;
    error = new AppError(error.message || 'Something went wrong', statusCode);
  }
  
  sendErrorResponse(error as AppError, req, res);
};

// Catch async errors
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

// Handle 404 errors
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`Not found - ${req.originalUrl}`, 404);
  next(error);
}; 