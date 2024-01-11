import { RequestHandler } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { logger } from '../utils/logger.js';
import { Proxy } from '../config/proxy-config.js';
import { CALL_ID, CONSUMER_ID } from "./tracingMiddleware.js";
import { APP_NAME } from "../config/base-config.js";

export const proxyMiddleware = (proxyContextPath: string, proxy: Proxy): RequestHandler => {
	return createProxyMiddleware(proxyContextPath, {
		target: proxy.toUrl,
		logLevel: 'error',
		headers: {
			[CONSUMER_ID]: APP_NAME,
		},
		logProvider: () => logger,
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
