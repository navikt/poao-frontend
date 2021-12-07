import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Error handler that logs to stdout and swallows any errors instead of passing it along to the next handler

export const errorHandlerMiddleware = () => {
	return handleError;
};

export const handleError = (err: Error, req: Request, res: Response, next?: NextFunction) => {
	logger.error(`Caught error for req: ${req.path}`, err);
	res.sendStatus(500);
}