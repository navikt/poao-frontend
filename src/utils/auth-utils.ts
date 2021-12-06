import jwksRsa, { RsaSigningKey } from 'jwks-rsa';
import { GetPublicKeyOrSecret, JwtHeader, SigningKeyCallback, verify, VerifyOptions } from 'jsonwebtoken';
import { Request } from 'express';
import fetch from 'node-fetch';
import { hoursToMs } from './utils';

export function createJwksClient(jwksUri: string): jwksRsa.JwksClient {
	return jwksRsa({
		cache: true,
		cacheMaxEntries: 5,
		cacheMaxAge: hoursToMs(1),
		jwksUri,
	});
}

export interface DiscoveryData {
	jwks_uri: string;
	issuer: string;
}

export async function getJwksUrlFromDiscoveryEndpoint(discoveryUrl: string): Promise<DiscoveryData> {
	return fetch(discoveryUrl)
		.then((res: any) => {
			if (!res.ok) {
				throw new Error(`Received unexpected status ${res.status} from ${discoveryUrl}`);
			}

			return res.json();
		})
		.then((discoveryData: any) => {
			const jwks_uri = discoveryData.jwks_uri;
			const issuer = discoveryData.issuer;

			if (!jwks_uri) {
				throw new Error('Could not find "jwks_uri" from discovery endpoint: ' + JSON.stringify(discoveryData));
			} else if (!issuer) {
				throw new Error('Could not find "issuer" from discovery endpoint: ' + JSON.stringify(discoveryData));
			}

			return {
				jwks_uri,
				issuer
			};
		});
}

export const getCookieValue = (req: Request, cookieName: string): string | undefined => {
	return req.cookies ? req.cookies[cookieName] : undefined;
};

export function createVerifyOptions(clientId: string, issuerUrl: string): VerifyOptions {
	return {
		audience: clientId,
		issuer: issuerUrl,
		algorithms: ['RS256']
	};
}

export function createKeyRetriever(jwksClient: jwksRsa.JwksClient) {
	return (header: JwtHeader, callback: SigningKeyCallback) => {
		if (!header.kid) {
			callback(new Error('Could not find kid from JWKS'));
			return;
		}

		jwksClient.getSigningKey(header.kid, function(err, key) {
			// The typings says that the key is always defined, but there have been cases where the key is undefined
			if (!key) {
				callback(new Error('Unable to find key for kid: ' + header.kid));
			} else {
				const signingKey = (key as RsaSigningKey).rsaPublicKey;
				callback(null, signingKey);
			}
		});
	};
}

export const verifyJwtToken = (token: string | undefined, keyRetriever: GetPublicKeyOrSecret, verifyOptions: VerifyOptions): Promise<void> => {
	return new Promise((resolve, reject) => {
		if (!token) {
			reject('Token is missing');
			return;
		}

		verify(token, keyRetriever, verifyOptions, function(err) {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
};
