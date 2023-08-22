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
import {BaseClient, Client} from 'openid-client';
import { TokenValidator } from '../utils/auth/token-validator';
import { createAzureAdScope, createTokenXScope } from '../utils/auth/auth-config-utils';
import { Request } from "express";

interface ProxyOboMiddlewareParams {
	authConfig: AuthConfig;
	oboTokenStore: OboTokenStore;
	oboTokenClient: Client;
	tokenValidator: TokenValidator;
	proxy: Proxy;
}

function createAppScope(isUsingTokenX: boolean, proxy: Proxy): string | null {
	if (!proxy.toApp) {
		return null
	}

	return isUsingTokenX ? createTokenXScope(proxy.toApp) : createAzureAdScope(proxy.toApp);
}

interface Error { status: number, message?: string | undefined }
export const setOBOTokenOnRequest = async (req: Request, tokenValidator: TokenValidator,
	 oboTokenClient: BaseClient, oboTokenStore: OboTokenStore, authConfig: AuthConfig, scope: string | null
): Promise<Error | undefined> => {
	const isUsingTokenX = authConfig.oboProviderType === OboProviderType.TOKEN_X;
	
	const accessToken = getAccessToken(req);
	if (!accessToken) {
		logger.warn('Access token is missing from proxy request');
		return { status: 401 }
	}

	const isValid = await tokenValidator.isValid(accessToken);
	if (!isValid) {
		logger.error('Access token is not valid');
		return { status: 401 }
	}

	// Proxy route is not configured with token-exchange
	if (!scope) {
		req.headers[AUTHORIZATION_HEADER] = '';
		req.headers[WONDERWALL_ID_TOKEN_HEADER] = '';
		return ;
	}

	const tokenSubject = getTokenSubject(accessToken);
	if (!tokenSubject) {
		logger.error('Unable to get subject from token');
		return { status: 401 }
	}

	let oboToken = await oboTokenStore.getUserOboToken(tokenSubject, scope);
	if (!oboToken) {
		const now = new Date().getTime()

		oboToken = isUsingTokenX
			? await createTokenXOnBehalfOfToken(oboTokenClient, scope, accessToken, authConfig.oboProvider.clientId)
			: await createAzureAdOnBehalfOfToken(oboTokenClient, scope, accessToken);

		const tokenExchangeTimeMs = new Date().getTime() - now

		logger.info(`On-behalf-of token created. application=${scope} issuer=${authConfig.oboProviderType} timeTakenMs=${tokenExchangeTimeMs}`);

		const expiresInSeconds = getSecondsUntil(oboToken.expiresAt * 1000);
		const expiresInSecondWithClockSkew = getExpiresInSecondWithClockSkew(expiresInSeconds);

		await oboTokenStore.setUserOboToken(tokenSubject, scope, expiresInSecondWithClockSkew, oboToken);
	}

	req.headers[AUTHORIZATION_HEADER] = `Bearer ${oboToken.accessToken}`;
	req.headers[WONDERWALL_ID_TOKEN_HEADER] = ''; // Vi trenger ikke å forwarde ID-token siden det ikke brukes
}

export function oboMiddleware(params: ProxyOboMiddlewareParams) {
	const { authConfig, proxy, tokenValidator, oboTokenClient, oboTokenStore } = params;
	const isUsingTokenX = authConfig.oboProviderType === OboProviderType.TOKEN_X;
	const scope = createAppScope(isUsingTokenX, proxy)

	return asyncMiddleware(async (req, res, next) => {
		logger.info(`Proxyer request ${req.path} til applikasjon ${proxy.toApp?.name || proxy.toUrl}`);
		const error = await setOBOTokenOnRequest(req, tokenValidator, oboTokenClient, oboTokenStore, authConfig, scope)
		if (!error) {
			next();
		} else {
			res.sendStatus(error?.status)
		}
	});
}