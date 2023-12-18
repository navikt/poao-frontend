import { RequestHandler } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { logger } from '../utils/logger';
import { Proxy } from '../config/proxy-config';
import {CALL_ID, CONSUMER_ID} from "./tracingMiddleware";
import {APP_NAME} from "../config/base-config";

export const proxyMiddleware = (proxyContextPath: string, proxy: Proxy): RequestHandler => {
	return createProxyMiddleware({
		target:  `${proxy.toUrl}${proxy.preserveFromPath ? proxyContextPath : ''}`,
		headers:  { [CONSUMER_ID]: APP_NAME },
		logger: logger,
		changeOrigin: true,
		on: {
			error: (error, _request, _response) => {
				logger.error({
					path: _request.path?.replace(/\d{11}/g, '<fnr>'),
					stack_trace: error.stack,
					message: `onError, error=${error.message}`,
					callId: _request.headers[CALL_ID],
					consumerId: _request.headers[CONSUMER_ID] });
			}
		},
	})
};
