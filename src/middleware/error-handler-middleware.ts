import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { CALL_ID, CONSUMER_ID } from "./tracingMiddleware.js";
import { errorCounter } from "../route/metrics.js";

// Error handler that logs to stdout and swallows any errors instead of passing it along to the next handler

export const errorHandlerMiddleware = () => {
	return handleError;
};

export const handleError = (err: Error, req: Request, res: Response, _next?: NextFunction) => {
	logger.error({
		message: `Caught error for req: ${req.path}, ${err}`,
		callId: req.headers[CALL_ID],
		consumerId: req.headers[CONSUMER_ID]
	});

	const errorType = getErrorType(err)
	errorCounter.inc({ errorType, consumerId: CONSUMER_ID })

	res.sendStatus(500);
}

const getErrorType = (err: Error): ErrorTypeNames => {
	const maybeErrorType = errorTypes.find(errorType => {
		err.toString().includes(errorType.message)
	})

	return maybeErrorType?.name || ErrorTypeNames.Other
}

enum ErrorTypeNames {
	SocketDisconnetBeforeTLSEstablished,
	Timeout,
	Other
}

const errorTypes = [
	{ name: ErrorTypeNames.SocketDisconnetBeforeTLSEstablished, message: "Error: Client network socket disconnected before secure TLS connection was established"},
	{ name: ErrorTypeNames.Timeout, message: 'outgoing request timed out after'}
]
