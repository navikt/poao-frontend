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
import { AuthConfig, OboProviderType } from '../config/auth-config';
import { ProxyConfig } from '../config/proxy-config';
import { getSecondsUntil } from '../utils/date-utisl';
import { BaseConfig } from '../config/base-config';

interface SetupProxyRoutesParams {
	app: express.Application;
	authConfig: AuthConfig;
	baseConfig: BaseConfig;
	proxyConfig: ProxyConfig;
	oboTokenStore: OboTokenStore;
	oboTokenClient: Client;
	tokenValidator: TokenValidator;
}

export const setupProxyRoutes = (params: SetupProxyRoutesParams): void => {
	const { app, authConfig, baseConfig, proxyConfig, oboTokenStore, oboTokenClient, tokenValidator } = params;

	proxyConfig.proxies.forEach((proxy) => {
		const proxyFrom = urlJoin(baseConfig.contextPath, proxy.fromPath);

		const isUsingTokenX = authConfig.oboProviderType === OboProviderType.TOKEN_X;

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
					logger.warn('Valid access token is missing from proxy request');
					res.sendStatus(401);
					return;
				}

				const tokenSubject = getTokenSubject(accessToken);

				if (!tokenSubject) {
					logger.error('Unable to get subject from token');
					res.sendStatus(401);
					return;
				}

				let oboToken = await oboTokenStore.getUserOboToken(tokenSubject, appId);

				if (!oboToken) {
					oboToken = isUsingTokenX
						? await createTokenXOnBehalfOfToken(oboTokenClient, appId, accessToken, authConfig.oboProvider.clientId)
						: await createAzureAdOnBehalfOfToken(oboTokenClient, appId, accessToken);

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
					: { [`^${proxyFrom}`]: '' },
				onError: (error, request, response) => {
					logger.error(`onError, error=${error.message}`);
				},
			})
		);
	});
};
