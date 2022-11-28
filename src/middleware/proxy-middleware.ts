import { RequestHandler } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { logger } from '../utils/logger';
import { Proxy } from '../config/proxy-config';

export const proxyMiddleware = (proxyContextPath: string, proxy: Proxy): RequestHandler => {
	return createProxyMiddleware(proxyContextPath, {
		target: proxy.toUrl,
		logLevel: 'error',
		logProvider: () => logger,
		onProxyRes: (proxyRes, req, res) => {
			const chunks: any[] = [];
			proxyRes.on('data', function (chunk) {
				chunks.push(chunk);
			});
			proxyRes.on('end', function () {
				const body = Buffer.concat(chunks);
				logger.info("res from proxied server:", body.toString());
				res.send(body)
			});
		},
		changeOrigin: true,
		pathRewrite: proxy.preserveFromPath
			? undefined
			: { [`^${proxyContextPath}`]: '' },
		onError: (error, _request, _response) => {
			logger.error(`onError, error=${error.message}`);
		},
	})
};
