import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { Client } from 'openid-client';
import urlJoin from 'url-join';
import { TokenValidator } from '../utils/auth/token-validator';
import { createAzureAdAppId, createTokenXAppId } from '../utils/auth/auth-config-utils';
import { logger } from '../utils/logger';
import {
	getAccessToken,
	getExpiresInSecondWithClockSkew,
	getTokenSubject,
	OboTokenStore
} from '../utils/auth/auth-token-utils';
import { asyncMiddleware } from '../utils/express-utils';
import { createAzureAdOnBehalfOfToken, createTokenXOnBehalfOfToken } from '../utils/auth/auth-client-utils';
import { AuthConfig, OboOidcProviderType } from '../config/auth-config';
import { ProxyConfig } from '../config/proxy-config';
import { getSecondsUntil } from '../utils/date-utisl';

interface SetupProxyRoutesParams {
	app: express.Application;
	authConfig: AuthConfig;
	proxyConfig: ProxyConfig;
	oboTokenStore: OboTokenStore;
	oboTokenClient: Client;
	tokenValidator: TokenValidator;
}

const PROXY_BASE_PATH = '/proxy';

export const setupProxyRoutes = (params: SetupProxyRoutesParams): void => {
	const { app, authConfig, proxyConfig, oboTokenStore, oboTokenClient, tokenValidator } = params;

	proxyConfig.proxies.forEach((proxy) => {
		const proxyFrom = urlJoin(PROXY_BASE_PATH, proxy.fromPath);

		const isUsingTokenX = authConfig.oboOidcProviderType === OboOidcProviderType.TOKEN_X;

		const appId = isUsingTokenX
			? createTokenXAppId(proxy.toApp)
			: createAzureAdAppId(proxy.toApp);

		app.use(
			proxyFrom,
			asyncMiddleware(async (req, res, next) => {
				logger.info(`Proxyer request ${req.path} til applikasjon ${proxy.toApp.name}`);

				const accessToken = getAccessToken(req);

				const isValid = await tokenValidator.isValid(accessToken);

				if (!isValid || !accessToken) {
					logger.info('Valid access token is missing from proxy request');
					res.sendStatus(401);
					return;
				}

				const tokenSubject = getTokenSubject(accessToken);

				if (!tokenSubject) {
					logger.info('Unable to get subject from token');
					res.sendStatus(401);
					return;
				}

				let oboToken = await oboTokenStore.getUserOboToken(tokenSubject, appId);

				if (!oboToken) {
					const oboTokenPromise = isUsingTokenX
						? createTokenXOnBehalfOfToken(
							oboTokenClient,
							appId,
							accessToken,
							authConfig.oboOidcProvider.clientId
						)
						: createAzureAdOnBehalfOfToken(oboTokenClient, appId, accessToken);

					oboToken = await oboTokenPromise;

					const expiresInSeconds = getSecondsUntil(oboToken.expiresAt * 1000);
					const expiresInSecondWithClockSkew = getExpiresInSecondWithClockSkew(expiresInSeconds);

					await oboTokenStore.setUserOboToken(tokenSubject, appId, expiresInSecondWithClockSkew, oboToken);
				}

				req.headers['Authorization'] = `Bearer ${oboToken.accessToken}`;

				next();
			}),
			createProxyMiddleware(proxyFrom, {
				target: proxy.toUrl,
				logLevel: 'debug',
				logProvider: () => logger,
				changeOrigin: true,
				pathRewrite: proxy.preserveFromPath
					? undefined
					: {
							[`^${proxyFrom}`]: '',
					  },
				onError: (error, request, response) => {
					logger.error(`onError, error=${error.message}`);
				},
			})
		);
	});
};
