import express from 'express';
import helmet from 'helmet';
import { isAbsolute, join } from 'path';
import { resolve } from 'url';
import env from './environment';
import { createEnvJsFile } from './frontend-env-creator';

const ALLOWED_DOMAINS = ["*.nav.no", "*.adeo.no"];
const NAV_DEKORATOR_PROXY_PATH = '/dekorator';

const serveFromPath = isAbsolute(env.serveFromPath)
	? env.serveFromPath
	: join(__dirname, env.serveFromPath);

const contextPath = env.contextPath === ''
	? '/'
	: env.contextPath;

const app: express.Application = express();

if (env.enableFrontendEnv) {
	createEnvJsFile(serveFromPath);
}

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

app.use(contextPath, express.static(serveFromPath, {
	cacheControl: false
}));

if (env.navDekoratorUrl || true) {
	app.get(`${NAV_DEKORATOR_PROXY_PATH}/*`, (req, res) => {
		const redirectUrl = req.originalUrl.slice(NAV_DEKORATOR_PROXY_PATH.length);
		res.redirect(resolve(env.navDekoratorUrl as string, redirectUrl));
	});
}

app.get(resolve(contextPath, '/internal/isReady'), (req, res) => {
	res.send('');
});

app.get(resolve(contextPath, '/internal/isAlive'), (req, res) => {
	res.send('');
});

app.get(resolve(contextPath, '/*'), (req, res) => {
	if (env.redirectOnNotFound) {
		res.redirect(contextPath);
	} else {
		res.sendFile(join(serveFromPath, 'index.html'));
	}
});

app.listen(env.port, () => {
	console.log('Starting server with config');
	console.log(`Public path: ${serveFromPath}`);
	console.log(`Context path: ${contextPath}`);
	console.log(`Redirect to index.html for 404: ${env.redirectOnNotFound}`);
	console.log(`Port: ${env.port}`);
	console.log(`Frontend environment enabled: ${env.enableFrontendEnv}`);

	if (env.navDekoratorUrl) {
		console.log(`Proxying requests to NAV dekorator on path ${NAV_DEKORATOR_PROXY_PATH} to: ${env.navDekoratorUrl}`);
	} else {
		console.log('Proxy to NAV dekorator is disabled');
	}
});
