import express from 'express';
import cors from 'cors';
import { isAbsolute, join } from 'path';
import cookieParser from 'cookie-parser';
import urlJoin from 'url-join';
import env, { FallbackStrategy } from './config/environment';
import { createEnvJsFile } from './frontend-env-creator';
import { authenticationWithLoginRedirect, createAuthConfig } from './middleware/auth-middleware';
import { logger } from './logger';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { JsonConfig, readConfigFile, validateConfig } from './config/json-config';
import { gcsRouter } from './gcs-router';
import { isRequestingFile } from './utils/utils';
import { helmetMiddleware } from './middleware/helmet-middleware';

const serveFromPath = isAbsolute(env.serveFromPath)
	? env.serveFromPath
	: join(__dirname, env.serveFromPath);

const contextPath = env.contextPath === ''
	? '/'
	: env.contextPath;

const jsonConfig = env.jsonConfig
	? JSON.parse(env.jsonConfig) as JsonConfig
	: readConfigFile(env.jsonConfigFilePath);

const app: express.Application = express();

async function startServer() {
	validateConfig(jsonConfig);

	logger.info('Starting server with config');

	if (env.gcsBucketName) {
		logger.info(`Serving files from GCS bucket. bucket=${env.gcsBucketName} contextPath=${env.gcsBucketContextPath || ''} fallback=${env.fallbackStrategy}`);
	} else {
		logger.info(`Serving files from local filesystem. path=${serveFromPath} fallback=${env.fallbackStrategy}`);
	}

	logger.info(`Context path: ${contextPath}`);
	logger.info(`Port: ${env.port}`);
	logger.info(`Frontend environment enabled: ${env.enableFrontendEnv}`);
	logger.info(`Enforce login: ${env.enforceLogin}`);

	logger.info(`Cors domain: ${env.corsDomain}`);
	logger.info(`Cors allow credentials: ${env.corsAllowCredentials}`);

	if (Object.keys(jsonConfig).length > 0) {
		logger.info(`Setting up server with JSON config: ${JSON.stringify(jsonConfig)}`);
	}

	if (env.enforceLogin) {
		logger.info(`OIDC discovery url: ${env.oidcDiscoveryUrl}`);
		logger.info(`OIDC client id: ${env.oidcClientId}`);
		logger.info(`Token cookie name: ${env.tokenCookieName}`);
		logger.info(`Login redirect url: ${env.loginRedirectUrl}`);
	}

	if (env.corsDomain) {
		app.use(cors({origin: env.corsDomain, credentials: env.corsAllowCredentials}));
	}

	app.use(helmetMiddleware());

	if (jsonConfig.proxies) {
		jsonConfig.proxies.forEach(proxy => {
			const proxyFrom = urlJoin(contextPath, proxy.from);
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

	app.get(urlJoin(contextPath, '/internal/isReady'), (req, res) => {
		res.send('');
	});

	app.get(urlJoin(contextPath, '/internal/isAlive'), (req, res) => {
		res.send('');
	});

	if (env.enforceLogin) {
		app.use(cookieParser());
		app.use(await authenticationWithLoginRedirect(createAuthConfig(env)));
	}

	if (env.gcsBucketName) {
		app.use(contextPath, gcsRouter({
			bucketName: env.gcsBucketName,
			contextPath,
			fallbackStrategy: env.fallbackStrategy,
			bucketContextPath: env.gcsBucketContextPath
		}));
	} else {
		app.use(contextPath, express.static(serveFromPath, {
			cacheControl: false
		}));

		app.get(urlJoin(contextPath, '/*'), (req, res) => {
			// If the user is requesting a file such as /path/to/img.png then we should always return 404 if the file does not exist
			if (env.fallbackStrategy === FallbackStrategy.NONE || isRequestingFile(req.path)) {
				res.sendStatus(404);
			} else if (env.fallbackStrategy === FallbackStrategy.REDIRECT) {
				res.redirect(contextPath);
			} else if (env.fallbackStrategy === FallbackStrategy.SERVE) {
				res.sendFile(join(serveFromPath, 'index.html'));
			} else {
				throw new Error('Unsupported strategy ' + env.fallbackStrategy);
			}
		});
	}

	app.listen(env.port, () => logger.info('Server started successfully'));
}

if (env.enableFrontendEnv) {
	createEnvJsFile(serveFromPath);
}

startServer()
	.catch(err => {
		logger.error('Failed to start server:', err);
	});
