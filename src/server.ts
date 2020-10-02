import express from 'express';
import helmet from 'helmet';
import { isAbsolute, join } from 'path';
import cookieParser from 'cookie-parser';
import env, { FallbackStrategy } from './environment';
import { createEnvJsFile } from './frontend-env-creator';
import { authenticationWithLoginRedirect } from './auth-middleware';
import { createAuthConfig } from './auth-utils';
import { joinUrlSegments } from './utils';

const ALLOWED_DOMAINS = ["*.nav.no", "*.adeo.no"];
const NAV_DEKORATOR_PROXY_PATH = '/dekorator';

const serveFromPath = isAbsolute(env.serveFromPath)
	? env.serveFromPath
	: join(__dirname, env.serveFromPath);

const contextPath = env.contextPath === ''
	? '/'
	: env.contextPath;

const app: express.Application = express();

async function startServer() {
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

	if (env.navDekoratorUrl) {
		const dekoratorProxyPath = joinUrlSegments(contextPath, NAV_DEKORATOR_PROXY_PATH);
		app.get(joinUrlSegments(dekoratorProxyPath, '*'), (req, res) => {
			const redirectUrl = req.originalUrl.slice(dekoratorProxyPath.length);
			res.redirect(joinUrlSegments(env.navDekoratorUrl as string, redirectUrl));
		});
	}

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
		console.log('Starting server with config');
		console.log(`Public path: ${serveFromPath}`);
		console.log(`Context path: ${contextPath}`);
		console.log(`Fallback strategy: ${env.fallbackStrategy}`);
		console.log(`Port: ${env.port}`);
		console.log(`Frontend environment enabled: ${env.enableFrontendEnv}`);
		console.log(`Enforce login: ${env.enforceLogin}`);

		if (env.enforceLogin) {
			console.log(`OIDC discovery url: ${env.oidcDiscoveryUrl}`);
			console.log(`OIDC client id: ${env.oidcClientId}`);
			console.log(`Token cookie name: ${env.tokenCookieName}`);
			console.log(`Login redirect url: ${env.loginRedirectUrl}`);
		}

		if (env.navDekoratorUrl) {
			console.log(`Proxying requests to NAV dekorator on path ${NAV_DEKORATOR_PROXY_PATH} to: ${env.navDekoratorUrl}`);
		} else {
			console.log('Proxy to NAV dekorator is disabled');
		}
	});
}

if (env.enableFrontendEnv) {
	createEnvJsFile(serveFromPath);
}

startServer()
	.catch(err => {
		console.error('Failed to start server', err);
	});
