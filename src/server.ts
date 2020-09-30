import express from 'express';
import helmet from 'helmet';
import { isAbsolute, join } from 'path';
import { resolve } from 'url';
import env from './environment';

const publicPath = isAbsolute(env.publicPath)
	? env.publicPath
	: join(__dirname, env.publicPath);

const contextPath = env.contextPath === ''
	? '/'
	: env.contextPath;

const app: express.Application = express();

app.use(helmet());

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
