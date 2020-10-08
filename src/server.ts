import express from 'express';
import helmet from 'helmet';
import { isAbsolute, join } from 'path';
import cookieParser from 'cookie-parser';
import env, { FallbackStrategy } from './environment';
import { createEnvJsFile } from './frontend-env-creator';
import { authenticationWithLoginRedirect } from './auth-middleware';
import { createAuthConfig } from './auth-utils';
import { joinUrlSegments } from './utils';
import { logger } from './logger';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { Config, readConfigFile, validateConfig } from './config';

const ALLOWED_DOMAINS = ["*.nav.no", "*.adeo.no"];

const serveFromPath = isAbsolute(env.serveFromPath)
	? env.serveFromPath
	: join(__dirname, env.serveFromPath);

const contextPath = env.contextPath === ''
	? '/'
	: env.contextPath;

const config = env.jsonConfig
	? JSON.parse(env.jsonConfig) as Config
	: readConfigFile(env.jsonConfigFilePath);

const app: express.Application = express();

async function startServer() {
	validateConfig(config);

	/**
	 * Det hadde vært best å fjerne 'unsafe-inline' fra scriptSrc, men NAV dekoratøren kjører inline scripts som ikke vil fungere uten dette.
	 * Denne reglen vil også treffe applikasjoner som bruker create-react-app siden den lager et inline script for å bootstrape appen.
	 * Dette kan fikses med å sette "INLINE_RUNTIME_CHUNK=false" i en .env fil.
	 */
	app.use(helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				connectSrc: ["'self'"].concat(ALLOWED_DOMAINS),
				baseUri: ["'self'"],
				blockAllMixedContent: [],
				fontSrc: ["'self'", "https:", "data:"].concat(ALLOWED_DOMAINS),
				frameAncestors: ["'self'"],
				objectSrc: ["'none'"],
				scriptSrc: ["'self'", "'unsafe-inline'"].concat(ALLOWED_DOMAINS).concat(["*.google-analytics.com"]),
				scriptSrcAttr: ["'none'"],
				styleSrc: ["'self'", "https:", "'unsafe-inline'"].concat(ALLOWED_DOMAINS),
				imgSrc: ["'self'", "data:"].concat(ALLOWED_DOMAINS),
				upgradeInsecureRequests: []
			}
		}
	}));

	if (config.proxies) {
		config.proxies.forEach(proxy => {
			// TODO: Add context path
			app.use(proxy.from, createProxyMiddleware(proxy.from, {
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

	app.get(joinUrlSegments(contextPath, '/internal/isReady'), (req, res) => {
		res.send('');
	});

	app.get(joinUrlSegments(contextPath, '/internal/isAlive'), (req, res) => {
		res.send('');
	});

	if (env.enforceLogin) {
		app.use(cookieParser());
		app.use(await authenticationWithLoginRedirect(createAuthConfig(env)));
	}

	app.use(contextPath, express.static(serveFromPath, {
		cacheControl: false
	}));

	if (env.fallbackStrategy !== FallbackStrategy.NONE) {
		app.get(joinUrlSegments(contextPath, '/*'), (req, res) => {
			if (env.fallbackStrategy === FallbackStrategy.REDIRECT) {
				res.redirect(contextPath);
			} else if (env.fallbackStrategy === FallbackStrategy.SERVE) {
				res.sendFile(join(serveFromPath, 'index.html'));
			} else {
				throw new Error('Unsupported strategy ' + env.fallbackStrategy);
			}
		});
	}

	app.listen(env.port, () => {
		logger.info('Starting server with config');
		logger.info(`Public path: ${serveFromPath}`);
		logger.info(`Context path: ${contextPath}`);
		logger.info(`Fallback strategy: ${env.fallbackStrategy}`);
		logger.info(`Port: ${env.port}`);
		logger.info(`Frontend environment enabled: ${env.enableFrontendEnv}`);
		logger.info(`Enforce login: ${env.enforceLogin}`);

		logger.info(`Setting up server with JSON config: ${JSON.stringify(config)}`);

		if (env.enforceLogin) {
			logger.info(`OIDC discovery url: ${env.oidcDiscoveryUrl}`);
			logger.info(`OIDC client id: ${env.oidcClientId}`);
			logger.info(`Token cookie name: ${env.tokenCookieName}`);
			logger.info(`Login redirect url: ${env.loginRedirectUrl}`);
		}
	});
}

if (env.enableFrontendEnv) {
	createEnvJsFile(serveFromPath);
}

startServer()
	.catch(err => {
		logger.error('Failed to start server', err);
	});
