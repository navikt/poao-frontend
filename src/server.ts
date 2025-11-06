import express from 'express';
import corsMiddleware from 'cors';
import urlJoin from 'url-join';
import compression from 'compression';
import { initSecureLog, logger } from './utils/logger.js';
import { gcsRoute } from './route/gcs-route.js';
import { helmetMiddleware } from './middleware/helmet-middleware.js';
import { redirectRoute } from './route/redirect-route.js';
import { createAppConfig, logAppConfig } from './config/app-config-resolver.js';
import { fallbackRoute } from './route/fallback-route.js';
import { pingRoute } from './route/ping-route.js';
import { errorHandlerMiddleware } from './middleware/error-handler-middleware.js';
import { frontendEnvRoute } from './route/frontend-env-route.js';
import { oboMiddleware } from './middleware/obo-middleware.js';
import { authInfoRoute } from './route/auth-info-route.js';
import { proxyMiddleware } from './middleware/proxy-middleware.js';
import { tracingMiddleware } from "./middleware/tracingMiddleware.js";
import { createTokenStore } from "./utils/auth/tokenStore/token-store.js";

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

	const routeUrl = (path: string): string => {
		const pathWithNamedWildcard = path.endsWith('/*') ? path.replace('/*', '/*path') : path;
		return urlJoin(base.contextPath, pathWithNamedWildcard);
	};

	app.use(compression({
		filter: (req: express.Request, res: express.Response) => {
			// Don't compress server sent events.
			if (req.headers["accept"] === "text/event-stream") {
				return false;
			}
			return compression.filter(req, res);
		},
	}));

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
		app.get(routeUrl('/auth/info'), authInfoRoute(auth.loginProviderType));

		if (proxy.proxies.length > 0) {
			const oboTokenStore = createTokenStore(auth.valkeyConfig);
			proxy.proxies.forEach(proxy => {
				const proxyFrom = routeUrl(proxy.fromPath);
				app.use(
					proxyFrom,
					oboMiddleware({ authConfig: auth, proxy, oboTokenStore }),
					proxyMiddleware(proxyFrom, proxy)
				);
			});
			process.on('SIGTERM', async () => {
				logger.info('SIGTERM signal received: closing Valkey connection');
				await oboTokenStore.close();
				logger.info('Valkey connection closed');
			});
		}
	} else {
		proxy.proxies.forEach(proxy => {
			const proxyFrom = routeUrl(proxy.fromPath);
			app.use(
				proxyFrom,
				proxyMiddleware(proxyFrom, proxy)
			);
		});
	}

	if (gcs) {
		app.use(base.contextPath, gcsRoute({
			bucketName: gcs.bucketName,
			contextPath: base.contextPath,
			fallbackStrategy: base.fallbackStrategy,
			bucketContextPath: gcs.bucketContextPath,
			enableModiaContextUpdater: base.enableModiaContextUpdater,
		}, dekorator));
	} else {
		// For at det skal funke å injecte-dekoratøren på / og /index.html må det inn i en handler og ikke bare
		// via express.static, fant ikke noen god måte å fange opp hvilken fil som
		if (dekorator) {
			app.use(routeUrl("/"), fallbackRoute(base, dekorator))
			app.use(routeUrl("/index.html"), fallbackRoute(base, dekorator))
		}
		app.use(base.contextPath, express.static(base.serveFromPath, { cacheControl: false }));
		app.get(routeUrl('/*'), fallbackRoute(base, dekorator));
	}

	const server = app.listen(base.port, () => logger.info('Server started successfully'));

	process.on('SIGTERM', () => {
		logger.info('SIGTERM signal received: closing HTTP server');
		server.close(() => {
			logger.info('HTTP server closed');
		});
	});

}

startServer()
	.catch(err => {
		logger.error('Failed to start server:', err);
	});
