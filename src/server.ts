import express from 'express';
import cors from 'cors';
import { join } from 'path';
import cookieParser from 'cookie-parser';
import urlJoin from 'url-join';
import { createEnvJsFile } from './frontend-env-creator';
import { authenticationWithLoginRedirect, createAuthConfig } from './middleware/auth-middleware';
import { logger } from './logger';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { gcsRouter } from './router/gcs-router';
import { isRequestingFile } from './utils/utils';
import { helmetMiddleware } from './middleware/helmet-middleware';
import { createAppConfig, FallbackStrategy, logAppConfig } from './config/app-config';
import { redirectRouter } from './router/redirect-router';

const app: express.Application = express();

async function startServer() {
	logger.info('Starting PTO-frontend');

	const appConfig = createAppConfig();

	logAppConfig(appConfig);

	if (appConfig.enableFrontendEnv) {
		createEnvJsFile(appConfig.serveFromPath);
	}

	if (appConfig.corsDomain) {
		app.use(cors({origin: appConfig.corsDomain, credentials: appConfig.corsAllowCredentials}));
	}

	app.use(helmetMiddleware());

	if (appConfig.redirects) {
		appConfig.redirects.forEach(redirect => {
			const redirectFrom = urlJoin(appConfig.contextPath, redirect.from);
			app.use(redirectFrom, redirectRouter({ to: redirect.to }));
		});
	}

	if (appConfig.proxies) {
		appConfig.proxies.forEach(proxy => {
			const proxyFrom = urlJoin(appConfig.contextPath, proxy.from);
			app.use(proxyFrom, createProxyMiddleware(proxyFrom, {
				target: proxy.to,
				logLevel: 'debug',
				logProvider: () => logger,
				changeOrigin: true,
				pathRewrite: proxy.preserveContextPath ? undefined : {
					[`^${proxy.from}`]: ''
				}
			}));
		});
	}

	app.get(urlJoin(appConfig.contextPath, '/internal/isReady'), (req, res) => {
		res.send('');
	});

	app.get(urlJoin(appConfig.contextPath, '/internal/isAlive'), (req, res) => {
		res.send('');
	});

	if (appConfig.enforceLogin) {
		app.use(cookieParser());
		app.use(await authenticationWithLoginRedirect(createAuthConfig(appConfig)));
	}

	if (appConfig.gcsBucketName) {
		app.use(appConfig.contextPath, gcsRouter({
			bucketName: appConfig.gcsBucketName,
			contextPath: appConfig.contextPath,
			fallbackStrategy: appConfig.fallbackStrategy,
			bucketContextPath: appConfig.gcsBucketContextPath
		}));
	} else {
		app.use(appConfig.contextPath, express.static(appConfig.serveFromPath, {cacheControl: false}));

		app.get(urlJoin(appConfig.contextPath, '/*'), (req, res) => {
			// If the user is requesting a file such as /path/to/img.png then we should always return 404 if the file does not exist
			if (appConfig.fallbackStrategy === FallbackStrategy.NONE || isRequestingFile(req.path)) {
				res.sendStatus(404);
			} else if (appConfig.fallbackStrategy === FallbackStrategy.REDIRECT) {
				res.redirect(appConfig.contextPath);
			} else if (appConfig.fallbackStrategy === FallbackStrategy.SERVE) {
				res.sendFile(join(appConfig.serveFromPath, 'index.html'));
			} else {
				throw new Error('Unsupported strategy ' + appConfig.fallbackStrategy);
			}
		});
	}

	app.listen(appConfig.port, () => logger.info('Server started successfully'));
}

startServer()
	.catch(err => {
		logger.error('Failed to start server:', err);
	});
