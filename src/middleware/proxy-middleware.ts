import { RequestHandler } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { logger } from '../utils/logger';
import { Proxy } from '../config/proxy-config';
import {CALL_ID, CONSUMER_ID} from "./tracingMiddleware";

export const proxyMiddleware = (proxyContextPath: string, proxy: Proxy): RequestHandler => {
	return createProxyMiddleware(proxyContextPath, {
		target: proxy.toUrl,
		logLevel: 'error',
		logProvider: () => logger,
		changeOrigin: true,
		pathRewrite: proxy.preserveFromPath
			? undefined
			: { [`^${proxyContextPath}`]: '' },
		onError: (error, _request, _response) => {
			logger.error({
				message: `onError, error=${error.message}`,
				callId: _request.headers[CALL_ID],
				consumerId: _request.headers[CONSUMER_ID] });
		},
	})
};
