import { NextFunction, Request, Response } from 'express';
import {
	createJwksClient,
	createKeyRetriever,
	createVerifyOptions,
	getCookieValue,
	getJwksUrlFromDiscoveryEndpoint,
	verifyJwtToken
} from '../utils/auth-utils';
import { getFullUrl } from '../utils/utils';
import { Environment } from '../config/environment';

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

export function createAuthConfig(env: Environment): AuthMiddlewareConfig {
	if (!env.loginRedirectUrl) {
		throw new Error('Cannot enforce login. Login redirect url is missing');
	}

	if (!env.oidcDiscoveryUrl) {
		throw new Error('Cannot enforce login. OIDC discovery url is missing');
	}

	if (!env.oidcClientId) {
		throw new Error('Cannot enforce login. OIDC client id is missing');
	}

	if (!env.tokenCookieName) {
		throw new Error('Cannot enforce login. Token cookie name is missing');
	}

	return {
		oidcClientId: env.oidcClientId,
		oidcDiscoveryUrl: env.oidcDiscoveryUrl,
		loginRedirectUrl: env.loginRedirectUrl,
		tokenCookieName: env.tokenCookieName
	};
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

