import express from 'express';
import corsMiddleware from 'cors';
import { join } from 'path';
import cookieParser from 'cookie-parser';
import urlJoin from 'url-join';
import { createEnvJsFile } from './utils/frontend-env-creator';
import { logger } from './utils/logger';
import { gcsRoute } from './route/gcs-route';
import { isRequestingFile } from './utils/utils';
import { helmetMiddleware } from './middleware/helmet-middleware';
import { redirectRoute } from './route/redirect-route';
import { createAppConfig, logAppConfig } from './config/app-config-resolver';
import { FallbackStrategy } from './config/base-config';
import { fallbackRoute } from './route/fallback-route';
import { pingRoute } from './route/ping-route';

const app: express.Application = express();

async function startServer() {
	logger.info('Starting poao-frontend');

	const appConfig = createAppConfig();

	const { base, cors, gcs, auth, proxy, redirect } = appConfig;

	logAppConfig(appConfig);

	if (base.enableFrontendEnv) {
		// TODO: Expose as endpoint to prevent fs read-only
		createEnvJsFile(base.serveFromPath);
	}

	if (cors.origin) {
		app.use(corsMiddleware({origin: cors.origin, credentials: cors.credentials }));
	}

	app.use(helmetMiddleware());

	app.use(cookieParser());

	redirect.redirects.forEach(redirect => {
		const redirectFrom = urlJoin(base.contextPath, redirect.from);
		app.use(redirectFrom, redirectRoute({ to: redirect.to , preserveContextPath: redirect.preserveContextPath}));
	});

	proxy.proxies.forEach(proxy => {
		// const proxyFrom = urlJoin(base.contextPath, proxy.from);
		//
		// app.use(proxyFrom, createProxyMiddleware(proxyFrom, {
		// 	target: proxy.to,
		// 	logLevel: 'debug',
		// 	logProvider: () => logger,
		// 	changeOrigin: true,
		// 	pathRewrite: proxy.preserveContextPath ? undefined : {
		// 		[`^${proxy.from}`]: ''
		// 	}
		// }));
	});

	app.get(urlJoin(base.contextPath, '/internal/isReady'), pingRoute());

	app.get(urlJoin(base.contextPath, '/internal/isAlive'), pingRoute());

	if (gcs) {
		app.use(base.contextPath, gcsRoute({
			bucketName: gcs.bucketName,
			contextPath: base.contextPath,
			fallbackStrategy: base.fallbackStrategy,
			bucketContextPath: gcs.bucketContextPath
		}));
	} else {
		app.use(base.contextPath, express.static(base.serveFromPath, {cacheControl: false}));

		app.get(urlJoin(base.contextPath, '/*'), fallbackRoute(base));
	}

	app.listen(base.port, () => logger.info('Server started successfully'));
}

startServer()
	.catch(err => {
		logger.error('Failed to start server:', err);
	});
