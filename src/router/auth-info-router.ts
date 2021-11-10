import { Request, Response } from 'express';
import {
	createJwksClient,
	createKeyRetriever,
	createVerifyOptions, getCookieValue,
	getJwksUrlFromDiscoveryEndpoint, verifyJwtToken
} from '../utils/auth-utils';
import { fromBase64 } from '../utils/utils';

interface AuthInfoResponse {
	loggedIn: boolean,
	remainingSeconds: number | null,
	expirationTime: string | null,
	securityLevel: string | null
}

const authInfoNotAuthenticated: AuthInfoResponse = {
	expirationTime: null,
	loggedIn: false,
	remainingSeconds: null,
	securityLevel: null
};

export async function authInfoRouter(config: { oidcClientId: string, oidcDiscoveryUrl: string, tokenCookieName: string }) {
	const discoveryData = await getJwksUrlFromDiscoveryEndpoint(config.oidcDiscoveryUrl);
	const jwksClient = createJwksClient(discoveryData.jwks_uri);
	const verifyOptions = createVerifyOptions(config.oidcClientId, discoveryData.issuer);
	const keyRetriever = createKeyRetriever(jwksClient);

	return (req: Request, res: Response) => {
		const token = getCookieValue(req, config.tokenCookieName);

		if (!token) {
			res.send(authInfoNotAuthenticated);
		} else {
			verifyJwtToken(token, keyRetriever, verifyOptions)
				.then(() => {
					const payload = JSON.parse(fromBase64(token.split('.')[1]));
					const epochSec = Math.ceil(new Date().getTime() / 1000);
					const expirationTime = new Date(payload.exp * 1000).toISOString()

					const authInfo: AuthInfoResponse = {
						loggedIn: true,
						expirationTime: expirationTime,
						remainingSeconds: payload.exp - epochSec,
						securityLevel: payload.acr
					};

					res.send(authInfo);
				})
				.catch(() => {
					res.send(authInfoNotAuthenticated);
				});
		}
	}
}