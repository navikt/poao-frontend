import { logger } from '../utils/logger';
import {
	getAccessToken,
	getExpiresInSecondWithClockSkew,
	getTokenSubject,
	OboTokenStore
} from '../utils/auth/auth-token-utils';
import { createAzureAdOnBehalfOfToken, createTokenXOnBehalfOfToken } from '../utils/auth/auth-client-utils';
import { getSecondsUntil } from '../utils/date-utisl';
import { AuthConfig, OboProviderType } from '../config/auth-config';
import { Proxy } from '../config/proxy-config';
import { Client } from 'openid-client';
import { TokenValidator } from '../utils/auth/token-validator';
import { createAzureAdAppId, createTokenXAppId } from '../utils/auth/auth-config-utils';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { ServerResponse } from 'http';

interface ProxyOboMiddlewareParams {
	authConfig: AuthConfig;
	oboTokenStore: OboTokenStore;
	oboTokenClient: Client;
	tokenValidator: TokenValidator;
	proxyContextPath: string;
	proxy: Proxy;
}

function statusUnauthenticated(res: ServerResponse): void {
	res.statusCode = 401;
	res.statusMessage = 'Unauthorized';
	res.end();
}

export function proxyOboMiddleware(params: ProxyOboMiddlewareParams) {
	const { authConfig, proxyContextPath, proxy, tokenValidator, oboTokenClient, oboTokenStore } = params;

	const isUsingTokenX = authConfig.oboProviderType === OboProviderType.TOKEN_X;

	const appId = isUsingTokenX
		? createTokenXAppId(proxy.toApp)
		: createAzureAdAppId(proxy.toApp);

	return createProxyMiddleware(proxyContextPath, {
		target: proxy.toUrl,
		logLevel: 'debug',
		logProvider: () => logger,
		changeOrigin: true,
		pathRewrite: proxy.preserveFromPath
			? undefined
			: { [`^${proxyContextPath}`]: '' },
		onProxyReq: async (proxyReq, req, res) => {
			logger.info(`Proxyer request ${req.method} ${req.url} til applikasjon ${proxy.toApp.name}`);

			const accessToken = getAccessToken(req.headers);

			if (!accessToken) {
				logger.warn('Access token is missing from proxy request');
				statusUnauthenticated(res);
				return;
			}

			const isValid = await tokenValidator.isValid(accessToken);

			if (!isValid) {
				logger.error('Access token is not valid');
				statusUnauthenticated(res);
				return;
			}

			const tokenSubject = getTokenSubject(accessToken);

			if (!tokenSubject) {
				logger.error('Unable to get subject from token');
				statusUnauthenticated(res);
				return;
			}

			let oboToken = await oboTokenStore.getUserOboToken(tokenSubject, appId);

			if (!oboToken) {
				logger.info('Creating new OBO token for application: ' + appId);

				oboToken = isUsingTokenX
					? await createTokenXOnBehalfOfToken(oboTokenClient, appId, accessToken, authConfig.oboProvider.clientId)
					: await createAzureAdOnBehalfOfToken(oboTokenClient, appId, accessToken);

				const expiresInSeconds = getSecondsUntil(oboToken.expiresAt * 1000);
				const expiresInSecondWithClockSkew = getExpiresInSecondWithClockSkew(expiresInSeconds);

				await oboTokenStore.setUserOboToken(tokenSubject, appId, expiresInSecondWithClockSkew, oboToken);
			}

			proxyReq.setHeader('Authorization', `Bearer ${oboToken.accessToken}`);
			proxyReq.removeHeader('X-Wonderwall-ID-Token'); // Vi trenger ikke å forwarde ID-token siden det ikke brukes
		},
		onError: (error, _request, _response) => {
			logger.error(`onError, error=${error.message}`);
		},
	});
}