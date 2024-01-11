import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { CALL_ID, CONSUMER_ID } from "./tracingMiddleware.js";

// Error handler that logs to stdout and swallows any errors instead of passing it along to the next handler

export const errorHandlerMiddleware = () => {
	return handleError;
};

export const handleError = (err: Error, req: Request, res: Response, _next?: NextFunction) => {
	logger.error({
		message: `Caught error for req: ${req.path}, ${err}}`,
		callId: req.headers[CALL_ID],
		consumerId: req.headers[CONSUMER_ID]
	});
	res.sendStatus(500);
}
