import { asyncMiddleware } from '../utils/express-utils';
import { logger } from '../utils/logger';
import {
	AUTHORIZATION_HEADER,
	getAccessToken,
	getExpiresInSecondWithClockSkew,
	getTokenSubject,
	OboTokenStore, WONDERWALL_ID_TOKEN_HEADER
} from '../utils/auth/auth-token-utils';
import { createAzureAdOnBehalfOfToken, createTokenXOnBehalfOfToken } from '../utils/auth/auth-client-utils';
import { getSecondsUntil } from '../utils/date-utils';
import { AuthConfig, OboProviderType } from '../config/auth-config';
import { Proxy } from '../config/proxy-config';
import { Client } from 'openid-client';
import { TokenValidator } from '../utils/auth/token-validator';
import { createAzureAdAppId, createTokenXAppId } from '../utils/auth/auth-config-utils';

interface ProxyOboMiddlewareParams {
	authConfig: AuthConfig;
	oboTokenStore: OboTokenStore;
	oboTokenClient: Client;
	tokenValidator: TokenValidator;
	proxy: Proxy;
}

function createAppId(isUsingTokenX: boolean, proxy: Proxy): string | null {
	if (!proxy.toApp) {
		return null
	}

	return isUsingTokenX ? createTokenXAppId(proxy.toApp) : createAzureAdAppId(proxy.toApp);
}

export function oboMiddleware(params: ProxyOboMiddlewareParams) {
	const { authConfig, proxy, tokenValidator, oboTokenClient, oboTokenStore } = params;

	const isUsingTokenX = authConfig.oboProviderType === OboProviderType.TOKEN_X;

	const appId = createAppId(isUsingTokenX, proxy)

	return asyncMiddleware(async (req, res, next) => {
		logger.info(`Proxyer request ${req.path} til applikasjon ${proxy.toApp?.name || proxy.toUrl}`);

		const accessToken = getAccessToken(req);

		if (!accessToken) {
			logger.warn('Access token is missing from proxy request');
			res.sendStatus(401);
			return;
		}

		const isValid = await tokenValidator.isValid(accessToken);

		if (!isValid) {
			logger.error('Access token is not valid');
			res.sendStatus(401);
			return;
		}

		// Proxy route is not configured with token-exchange
		if (!appId) {
			req.headers[AUTHORIZATION_HEADER] = '';
			req.headers[WONDERWALL_ID_TOKEN_HEADER] = '';
			next();
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
			const now = new Date().getTime()

			oboToken = isUsingTokenX
				? await createTokenXOnBehalfOfToken(oboTokenClient, appId, accessToken, authConfig.oboProvider.clientId)
				: await createAzureAdOnBehalfOfToken(oboTokenClient, appId, accessToken);

			const tokenExchangeTimeMs = new Date().getTime() - now

			logger.info(`On-behalf-of token created. application=${appId} issuer=${authConfig.oboProviderType} timeTakenMs=${tokenExchangeTimeMs}`);

			const expiresInSeconds = getSecondsUntil(oboToken.expiresAt * 1000);
			const expiresInSecondWithClockSkew = getExpiresInSecondWithClockSkew(expiresInSeconds);

			await oboTokenStore.setUserOboToken(tokenSubject, appId, expiresInSecondWithClockSkew, oboToken);
		}

		req.headers[AUTHORIZATION_HEADER] = `Bearer ${oboToken.accessToken}`;
		req.headers[WONDERWALL_ID_TOKEN_HEADER] = ''; // Vi trenger ikke å forwarde ID-token siden det ikke brukes

		next();
	});
}