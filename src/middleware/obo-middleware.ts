import { Request } from "express";
import { AuthConfig, OboProviderType } from '../config/auth-config.js';
import { Proxy } from '../config/proxy-config.js';
import { createAzureAdOnBehalfOfToken, createTokenXOnBehalfOfToken } from '../utils/auth/auth-client-utils.js';
import { createAzureAdScope, createTokenXScope } from '../utils/auth/auth-config-utils.js';
import {
    AUTHORIZATION_HEADER,
    getAccessToken,
    getExpiresInSecondWithClockSkew,
    WONDERWALL_ID_TOKEN_HEADER
} from '../utils/auth/auth-token-utils.js';
import { TokenValidator } from '../utils/auth/token-validator.js';
import { createOboTokenKey, OboTokenStore } from "../utils/auth/tokenStore/token-store.js";
import { asyncMiddleware } from '../utils/express-utils.js';
import { logger } from '../utils/logger.js';
import { CALL_ID, CONSUMER_ID } from "./tracingMiddleware.js";
import {expiresIn} from "@navikt/oasis";

interface ProxyOboMiddlewareParams {
	authConfig: AuthConfig;
	oboTokenStore: OboTokenStore;
	tokenValidator: TokenValidator;
	proxy: Proxy;
}

function createAppScope(isUsingTokenX: boolean, proxy: Proxy): string | null {
	if (!proxy.toApp) {
		return null
	}

	return isUsingTokenX ? createTokenXScope(proxy.toApp) : createAzureAdScope(proxy.toApp);
}

async function getOrCreateOboToken(
	accessToken: string,
	scope: string,
	isUsingTokenX: boolean,
	oboTokenStore: OboTokenStore,
	authConfig: AuthConfig,
	req: Request
): Promise<string> {
	const oboTokenKey = createOboTokenKey(accessToken, scope);

	const cachedToken = await oboTokenStore.getUserOboToken(oboTokenKey);
	if (cachedToken) {
		return cachedToken;
	}

	const now = new Date().getTime();

	const newOboToken = isUsingTokenX
		? await createTokenXOnBehalfOfToken(scope, accessToken)
		: await createAzureAdOnBehalfOfToken(scope, accessToken);

	const tokenExchangeTimeMs = new Date().getTime() - now;

	logger.info({
		message: `On-behalf-of token created. application=${scope} issuer=${authConfig.oboProviderType} timeTakenMs=${tokenExchangeTimeMs}`,
		callId: req.headers[CALL_ID],
		consumerId: req.headers[CONSUMER_ID]
	});

	const expiresInSeconds = expiresIn(newOboToken);
	const expiresInSecondWithClockSkew = getExpiresInSecondWithClockSkew(expiresInSeconds);

	await oboTokenStore.setUserOboToken(oboTokenKey, expiresInSecondWithClockSkew, newOboToken);

	return newOboToken;
}

interface Error { status: number, message?: string | undefined }
export const setOBOTokenOnRequest = async (req: Request, tokenValidator: TokenValidator,
	oboTokenStore: OboTokenStore, authConfig: AuthConfig, scope: string | null
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

	const oboToken = await getOrCreateOboToken(
		accessToken,
		scope,
		isUsingTokenX,
		oboTokenStore,
		authConfig,
		req
	);

	req.headers[AUTHORIZATION_HEADER] = `Bearer ${oboToken}`;
	req.headers[WONDERWALL_ID_TOKEN_HEADER] = ''; // Vi trenger ikke å forwarde ID-token siden det ikke brukes
	return;
}

export function oboMiddleware(params: ProxyOboMiddlewareParams) {
	const { authConfig, proxy, tokenValidator, oboTokenStore } = params;
	const isUsingTokenX = authConfig.oboProviderType === OboProviderType.TOKEN_X;
	const scope = createAppScope(isUsingTokenX, proxy)

	return asyncMiddleware(async (req, res, next) => {
		const error = await setOBOTokenOnRequest(req, tokenValidator, oboTokenStore, authConfig, scope)
		if (!error) {
			next();
		} else {
			res.sendStatus(error?.status)
		}
	});
}