import { NextFunction, Request, Response } from 'express';
import { handleError } from '../middleware/error-handler-middleware.js';

export const asyncMiddleware = (middleware: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
	return (req: Request, res: Response, next: NextFunction) =>
		Promise
			.resolve(middleware(req, res, next))
			.catch((error) => {handleError(error, req, res, next);});
};
