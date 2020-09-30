import express from 'express';
import helmet from 'helmet';
import { isAbsolute, join } from 'path';
import { resolve } from 'url';
import env from './environment';

const ALLOWED_DOMAINS = ["*.nav.no", "*.adeo.no"];

const publicPath = isAbsolute(env.publicPath)
	? env.publicPath
	: join(__dirname, env.publicPath);

const contextPath = env.contextPath === ''
	? '/'
	: env.contextPath;

const app: express.Application = express();

app.use(helmet({
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			baseUri: ["'self'"],
			blockAllMixedContent: [],
			fontSrc: ["'self'", "https:", "data:"].concat(ALLOWED_DOMAINS),
			frameAncestors: ["'self'"],
			objectSrc: ["'none'"],
			scriptSrc: ["'self'"].concat(ALLOWED_DOMAINS),
			scriptSrcAttr: ["'none'"],
			styleSrc: ["'self'", "https:", "'unsafe-inline'"].concat(ALLOWED_DOMAINS),
			imgSrc: ["'self'", "data:"].concat(ALLOWED_DOMAINS),
			upgradeInsecureRequests: []
		}
	}
}));

app.use(contextPath, express.static(publicPath, {
	cacheControl: false
}));

app.get(resolve(contextPath, '/internal/isReady'), function (req, res) {
	res.send('');
});

app.get(resolve(contextPath, '/internal/isAlive'), function (req, res) {
	res.send('');
});

app.get(resolve(contextPath, '/*'), (req, res) => {
	if (env.redirectOnNotFound) {
		res.redirect(contextPath);
	} else {
		res.sendFile(join(publicPath, 'index.html'));
	}
});

app.listen(env.port, function () {
	console.log('Starting server with following parameters');
	console.log(`Public path: ${publicPath}`);
	console.log(`Context path: ${contextPath}`);
	console.log(`Redirect to index.html for 404: ${env.redirectOnNotFound}`);
	console.log(`Port: ${env.port}`);
});
