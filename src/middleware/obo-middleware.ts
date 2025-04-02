import { asyncMiddleware } from '../utils/express-utils.js';
import { logger } from '../utils/logger.js';
import {
	AUTHORIZATION_HEADER,
	getAccessToken,
	getExpiresInSecondWithClockSkew,
	getTokenSubject,
	WONDERWALL_ID_TOKEN_HEADER
} from '../utils/auth/auth-token-utils.js';
import { createAzureAdOnBehalfOfToken, createTokenXOnBehalfOfToken } from '../utils/auth/auth-client-utils.js';
import { getSecondsUntil } from '../utils/date-utils.js';
import { AuthConfig, OboProviderType } from '../config/auth-config.js';
import { Proxy } from '../config/proxy-config.js';
import { BaseClient, Client } from 'openid-client';
import { TokenValidator } from '../utils/auth/token-validator.js';
import { createAzureAdScope, createTokenXScope } from '../utils/auth/auth-config-utils.js';
import { Request } from "express";
import { CALL_ID, CONSUMER_ID } from "./tracingMiddleware.js";
import {OboTokenStore} from "../utils/auth/tokenStore/token-store.js";

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
		logger.warn({ message: 'Access token is missing from proxy request', callId: req.headers[CALL_ID], consumerId: req.headers[CONSUMER_ID] });
		return { status: 401 }
	}

	const isValid = await tokenValidator.isValid(accessToken);
	if (!isValid) {
		logger.error({ message: 'Access token is not valid', callId: req.headers[CALL_ID], consumerId: req.headers[CONSUMER_ID] });
		return { status: 401 }
	}

	// Proxy route is not configured with token-exchange
	if (!scope) {
		req.headers[AUTHORIZATION_HEADER] = '';
		req.headers[WONDERWALL_ID_TOKEN_HEADER] = '';
		return;
	}

	const tokenSubject = getTokenSubject(accessToken);
	if (!tokenSubject) {
		logger.error({ message: 'Unable to get subject from token', callId: req.headers[CALL_ID], consumerId: req.headers[CONSUMER_ID] });
		return { status: 401 }
	}

	let oboToken = await oboTokenStore.getUserOboToken(tokenSubject, scope);
	if (!oboToken) {
		const now = new Date().getTime()

		oboToken = isUsingTokenX
			? await createTokenXOnBehalfOfToken(oboTokenClient, scope, accessToken, authConfig.oboProvider.clientId)
			: await createAzureAdOnBehalfOfToken(oboTokenClient, scope, accessToken);

		const tokenExchangeTimeMs = new Date().getTime() - now

		logger.info({
			message: `On-behalf-of token created. application=${scope} issuer=${authConfig.oboProviderType} timeTakenMs=${tokenExchangeTimeMs}`,
			callId: req.headers[CALL_ID],
			consumerId: req.headers[CONSUMER_ID]
		});

		const expiresInSeconds = getSecondsUntil(oboToken.expiresAt * 1000);
		const expiresInSecondWithClockSkew = getExpiresInSecondWithClockSkew(expiresInSeconds);

		await oboTokenStore.setUserOboToken(tokenSubject, scope, expiresInSecondWithClockSkew, oboToken);
	} else {
		logger.info({
			message: `On-behalf-of fetched from in-memory cache`,
			callId: req.headers[CALL_ID],
			consumerId: req.headers[CONSUMER_ID]
		});
	}

	req.headers[AUTHORIZATION_HEADER] = `Bearer ${oboToken.accessToken}`;
	req.headers[WONDERWALL_ID_TOKEN_HEADER] = ''; // Vi trenger ikke å forwarde ID-token siden det ikke brukes
	return;
}

export function oboMiddleware(params: ProxyOboMiddlewareParams) {
	const { authConfig, proxy, tokenValidator, oboTokenClient, oboTokenStore } = params;
	const isUsingTokenX = authConfig.oboProviderType === OboProviderType.TOKEN_X;
	const scope = createAppScope(isUsingTokenX, proxy)

	return asyncMiddleware(async (req, res, next) => {
		logger.info({
			message: `Proxyer request ${req.path} til applikasjon ${proxy.toApp?.name || proxy.toUrl}`,
			callId: req.headers[CALL_ID],
			consumerId: req.headers[CONSUMER_ID]
		});
		const error = await setOBOTokenOnRequest(req, tokenValidator, oboTokenClient, oboTokenStore, authConfig, scope)
		if (!error) {
			next();
		} else {
			res.sendStatus(error?.status)
		}
	});
}