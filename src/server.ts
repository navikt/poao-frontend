import express from 'express';
import corsMiddleware from 'cors';
import cookieParser from 'cookie-parser';
import urlJoin from 'url-join';
import { logger } from './utils/logger';
import { gcsRoute } from './route/gcs-route';
import { helmetMiddleware } from './middleware/helmet-middleware';
import { redirectRoute } from './route/redirect-route';
import { createAppConfig, logAppConfig } from './config/app-config-resolver';
import { fallbackRoute } from './route/fallback-route';
import { pingRoute } from './route/ping-route';
import { errorHandlerMiddleware } from './middleware/error-handler-middleware';
import { createTokenStore } from './utils/auth/in-memory-token-store';
import { createTokenValidator } from './utils/auth/token-validator';
import { createClient, createIssuer } from './utils/auth/auth-client-utils';
import { createJWKS } from './utils/auth/auth-config-utils';
import { frontendEnvRoute } from './route/frontend-env-route';
import { proxyOboMiddleware } from './middleware/proxy-obo-middleware';
import { proxyRoute } from './route/proxy-route';
import { authInfoRoute } from './route/auth-info-route';

const app: express.Application = express();

async function startServer() {
	logger.info('Starting poao-frontend');

	const appConfig = createAppConfig();

	const { base, cors, gcs, auth, proxy, redirect } = appConfig;

	logAppConfig(appConfig);

	const routeUrl = (path: string): string => urlJoin(base.contextPath, path)

	if (cors.origin) {
		app.use(corsMiddleware({origin: cors.origin, credentials: cors.credentials }));
	}

	app.use(helmetMiddleware());

	app.use(errorHandlerMiddleware());

	app.use(cookieParser());

	app.get(routeUrl('/internal/isReady'), pingRoute());

	app.get(routeUrl('/internal/isAlive'), pingRoute());

	if (base.enableFrontendEnv) {
		app.get(routeUrl('/env.js'), frontendEnvRoute());
	}

	redirect.redirects.forEach(redirect => {
		app.use(routeUrl(redirect.from), redirectRoute({ to: redirect.to , preserveContextPath: redirect.preserveContextPath}));
	});

	if (auth && proxy.proxies.length > 0) {
		const oboTokenStore = createTokenStore();

		const tokenValidator = await createTokenValidator(auth.loginProvider.discoveryUrl, auth.loginProvider.clientId);

		const oboIssuer = await createIssuer(auth.oboProvider.discoveryUrl);

		const oboTokenClient = createClient(oboIssuer, auth.oboProvider.clientId, createJWKS(auth.oboProvider.privateJwk));

		proxy.proxies.forEach(p => {
			const proxyFrom = routeUrl(p.fromPath);

			app.use(
				proxyFrom,
				proxyOboMiddleware({ authConfig: auth, proxy: p, oboTokenStore, oboTokenClient, tokenValidator }),
				proxyRoute(proxyFrom, p)
			);
		});

		app.get(routeUrl('/auth/info'), authInfoRoute(tokenValidator));
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

		app.get(routeUrl('/*'), fallbackRoute(base));
	}

	app.listen(base.port, () => logger.info('Server started successfully'));
}

startServer()
	.catch(err => {
		logger.error('Failed to start server:', err);
	});
