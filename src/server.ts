import express from 'express';
import corsMiddleware from 'cors';
import cookieParser from 'cookie-parser';
import urlJoin from 'url-join';
import { createEnvJsFile } from './utils/frontend-env-creator';
import { logger } from './utils/logger';
import { gcsRoute } from './route/gcs-route';
import { helmetMiddleware } from './middleware/helmet-middleware';
import { redirectRoute } from './route/redirect-route';
import { createAppConfig, logAppConfig } from './config/app-config-resolver';
import { fallbackRoute } from './route/fallback-route';
import { pingRoute } from './route/ping-route';
import { errorHandlerMiddleware } from './middleware/error-handler-middleware';
import { setupProxyRoutes } from './route/setup-proxy-routes';
import { createTokenStore } from './utils/auth/in-memory-token-store';
import { createTokenValidator } from './utils/auth/token-validator';
import { createClient, createIssuer } from './utils/auth/auth-client-utils';
import { createJWKS } from './utils/auth/auth-config-utils';

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

	app.use(errorHandlerMiddleware());

	app.use(cookieParser());

	app.get(urlJoin(base.contextPath, '/internal/isReady'), pingRoute());

	app.get(urlJoin(base.contextPath, '/internal/isAlive'), pingRoute());

	redirect.redirects.forEach(redirect => {
		const redirectFrom = urlJoin(base.contextPath, redirect.from);
		app.use(redirectFrom, redirectRoute({ to: redirect.to , preserveContextPath: redirect.preserveContextPath}));
	});

	if (auth && proxy.proxies.length > 0) {
		const tokenStore = createTokenStore();

		const tokenValidator = await createTokenValidator(auth.loginOidcProvider.discoveryUrl, auth.loginOidcProvider.clientId);

		const oboIssuer = await createIssuer(auth.oboOidcProvider.discoveryUrl);

		const oboClient = createClient(oboIssuer, auth.oboOidcProvider.clientId, createJWKS(auth.oboOidcProvider.privateJwk));

		setupProxyRoutes({
			app: app,
			authConfig: auth,
			proxyConfig: proxy,
			tokenValidator: tokenValidator,
			oboTokenClient: oboClient,
			oboTokenStore: tokenStore
		});
	}

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
