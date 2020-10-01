import { NextFunction, Request, Response } from 'express';
import {
	createJwksClient,
	createKeyRetriever,
	createVerifyOptions,
	getCookieValue,
	getJwksUrlFromDiscoveryEndpoint,
	verifyJwtToken
} from './auth-utils';
import { getFullUrl } from './utils';

export interface AuthMiddlewareConfig {
	oidcDiscoveryUrl: string;
	oidcClientId: string;
	loginRedirectUrl: string;
	tokenCookieName: string;
}

const RETURN_TO = '{RETURN_TO_URL}';

function createLoginRedirectUrl(returnToUrl: string, loginRedirectUrl: string): string {
	return loginRedirectUrl.replace(RETURN_TO, encodeURIComponent(returnToUrl))
}

export const authenticationWithLoginRedirect = async (config: AuthMiddlewareConfig) => {
	const discoveryData = await getJwksUrlFromDiscoveryEndpoint(config.oidcDiscoveryUrl);
	const jwksClient = createJwksClient(discoveryData.jwks_uri);
	const verifyOptions = createVerifyOptions(config.oidcClientId, discoveryData.issuer);
	const keyRetriever = createKeyRetriever(jwksClient);
	const redirectToLogin = (req: Request, res: Response) => res.redirect(createLoginRedirectUrl(getFullUrl(req), config.loginRedirectUrl));

	return (req: Request, res: Response, next: NextFunction) => {
		const token = getCookieValue(req, config.tokenCookieName);

		if (!token) {
			redirectToLogin(req, res);
		} else {
			verifyJwtToken(token, keyRetriever, verifyOptions)
				.then(() => next())
				.catch(() => redirectToLogin(req, res));
		}

	}
};

