import {NextFunction, Request, RequestHandler, Response} from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { logger } from '../utils/logger';
import { Proxy } from '../config/proxy-config';
import {CALL_ID, CONSUMER_ID} from "./tracingMiddleware";
import {APP_NAME} from "../config/base-config";
import winston, {LeveledLogMethod} from "winston";

const loggerProxy: winston.Logger = logger
const proxyWrapperWithRequestLogging = (proxyContextPath: string, proxy: Proxy) => {
	const middleware = proxyMiddleware(proxyContextPath, proxy)
	return (req: Request, res: Response, next: NextFunction) => {
		const logError: LeveledLogMethod = (message: any) => {
			logger.error(
				{
					path: req.path?.replace(/\d{11}/g, '<fnr>'),
					message: message,
					callId: req.headers[CALL_ID],
					consumerId: req.headers[CONSUMER_ID]
				}
			)
			return logger
		}
		loggerProxy['error'] = logError
		middleware(req, res, next)
	}
}

export const proxyMiddleware = (proxyContextPath: string, proxy: Proxy): RequestHandler => {
	return createProxyMiddleware({
		target: proxy.toUrl,
		logLevel: 'error',
		headers: {
			[CONSUMER_ID]: APP_NAME,
		},
		logProvider: () => loggerProxy,
		changeOrigin: true,
		pathRewrite: proxy.preserveFromPath
			? undefined
			: { [`^${proxyContextPath}`]: '' },
		onError: (error, _request, _response) => {
			logger.error({
				path: _request.path?.replace(/\d{11}/g, '<fnr>'),
				stack_trace: error.stack,
				message: `onError, error=${error.message}`,
				callId: _request.headers[CALL_ID],
				consumerId: _request.headers[CONSUMER_ID]
			});
		},
	})
};
