import express from 'express';
import corsMiddleware from 'cors';
import urlJoin from 'url-join';
import compression from 'compression';
import { initSecureLog, logger } from './utils/logger';
import { gcsRoute } from './route/gcs-route';
import { helmetMiddleware } from './middleware/helmet-middleware';
import { redirectRoute } from './route/redirect-route';
import { createAppConfig, logAppConfig } from './config/app-config-resolver';
import { fallbackRoute } from './route/fallback-route';
import { pingRoute } from './route/ping-route';
import { errorHandlerMiddleware } from './middleware/error-handler-middleware';
import { createTokenStore } from './utils/auth/in-memory-token-store';
import { createTokenValidator, mapLoginProviderTypeToValidatorType } from './utils/auth/token-validator';
import { createClient, createIssuer } from './utils/auth/auth-client-utils';
import { createJWKS } from './utils/auth/auth-config-utils';
import { frontendEnvRoute } from './route/frontend-env-route';
import { oboMiddleware } from './middleware/obo-middleware';
import { authInfoRoute } from './route/auth-info-route';
import { proxyMiddleware } from './middleware/proxy-middleware';
import {tracingMiddleware} from "./middleware/tracingMiddleware";

const app: express.Application = express();

async function startServer() {
	logger.info('Starting poao-frontend');
	const appConfig = createAppConfig();
	const { base, cors, gcs, auth, proxy, redirect, dekorator } = appConfig;
	logAppConfig(appConfig);

	if (appConfig.base.enableSecureLogs) {
		initSecureLog()
	}
	app.get('/internal/ready', pingRoute());
	app.get('/internal/alive', pingRoute());

	const routeUrl = (path: string): string => urlJoin(base.contextPath, path)

	app.use(compression())

	if (cors.origin) {
		app.use(corsMiddleware({
			origin: cors.origin,
			credentials: cors.credentials,
			maxAge: cors.maxAge,
			allowedHeaders: cors.allowedHeaders
		}));
	}

	app.use(tracingMiddleware)
	app.use(helmetMiddleware(appConfig.header));
	app.use(errorHandlerMiddleware());

	if (base.enableFrontendEnv) {
		app.get(routeUrl('/env.js'), frontendEnvRoute());
	}

	redirect.redirects.forEach(redirect => {
		app.get(routeUrl(redirect.fromPath), redirectRoute({
			fromPath: redirect.fromPath,
			to: redirect.toUrl,
			preserveContextPath: redirect.preserveFromPath
		}));
	});

	if (auth) {
		const oboTokenStore = createTokenStore();
		const tokenValidatorType = mapLoginProviderTypeToValidatorType(auth.loginProviderType);
		const tokenValidator = await createTokenValidator(tokenValidatorType, auth.loginProvider.discoveryUrl, auth.loginProvider.clientId);
		app.get(routeUrl('/auth/info'), authInfoRoute(tokenValidator));

		if (proxy.proxies.length > 0) {
			const oboIssuer = await createIssuer(auth.oboProvider.discoveryUrl);
			const oboTokenClient = createClient(oboIssuer, auth.oboProvider.clientId, createJWKS(auth.oboProvider.privateJwk));
			proxy.proxies.forEach(p => {
				const proxyFrom = routeUrl(p.fromPath);
				app.use(
					proxyFrom,
					oboMiddleware({ authConfig: auth, proxy: p, oboTokenStore, oboTokenClient, tokenValidator }),
					proxyMiddleware(proxyFrom, p)
				);
			});
		}
	}

	if (gcs) {
		app.use(base.contextPath, gcsRoute({
			bucketName: gcs.bucketName,
			contextPath: base.contextPath,
			fallbackStrategy: base.fallbackStrategy,
			bucketContextPath: gcs.bucketContextPath,
			enableModiaContextUpdater: base.enableModiaContextUpdater,
		}));
	} else {
		// For at det skal funke å injecte-dekoratøren på / og /index.html må det inn i en handler og ikke bare
		// via express.static, fant ikke noen god måte å fange opp hvilken fil som
		if (dekorator) {
			app.use(routeUrl("/"), fallbackRoute(base, dekorator))
			app.use(routeUrl("/index.html"), fallbackRoute(base, dekorator))
		}
		app.use(base.contextPath, express.static(base.serveFromPath, {cacheControl: false}));
		app.get(routeUrl('/*'), fallbackRoute(base, dekorator));
	}

	app.listen(base.port, () => logger.info('Server started successfully'));
}

startServer()
	.catch(err => {
		logger.error('Failed to start server:', err);
	});
