import express from 'express';
import { isAbsolute, join } from 'path';
import { resolve } from 'url';
import env from './environment';

const publicPath = isAbsolute(env.publicPath)
	? env.publicPath
	: join(__dirname, env.publicPath);

const hasContextPath = env.contextPath !== '';

const app: express.Application = express();

app.use(hasContextPath ? env.contextPath : '/', express.static(publicPath, {
	cacheControl: false
}));

app.get(resolve(env.contextPath, '/internal/isReady'), function (req, res) {
	res.send('');
});

app.get(resolve(env.contextPath, '/internal/isAlive'), function (req, res) {
	res.send('');
});

if (env.redirectOnNotFound) {
	app.get(resolve(env.contextPath, '/*'), (req, res) => {
		res.redirect(hasContextPath ? env.contextPath : '/');
	});
} else {
	app.get(resolve(env.contextPath, '/*'), (req, res) => {
		res.sendFile(join(publicPath, 'index.html'));
	});
}

app.listen(env.port, function () {
	console.log('Starting server with following parameters');
	console.log(`Public path: ${publicPath}`);
	console.log(`Context path: ${env.contextPath}`);
	console.log(`Redirect to index.html for 404: ${env.redirectOnNotFound}`);
	console.log(`Port: ${env.port}`);
});
