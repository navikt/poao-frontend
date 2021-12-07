import jwksRsa, { RsaSigningKey } from 'jwks-rsa';
import axios from 'axios';
import { GetPublicKeyOrSecret, JwtHeader, SigningKeyCallback, verify, VerifyOptions } from 'jsonwebtoken';

const ONE_HOUR_MS = 1000 * 60 * 60;

export async function createTokenValidator(discoverUrl: string, clientId: string): Promise<TokenValidator> {
	const discoveryData = await getJwksUrlFromDiscoveryEndpoint(discoverUrl);
	const jwksClient = createJwksClient(discoveryData.jwks_uri);
	const verifyOptions = createVerifyOptions(clientId, discoveryData.issuer);
	const keyRetriever = createKeyRetriever(jwksClient);

	return {
		isValid: async (token: string | undefined): Promise<boolean> => {
			if (!token) {
				return false
			}

			return verifyJwtToken(token, keyRetriever, verifyOptions)
				.then(() => true)
				.catch(() => false);
		}
	}
}

export interface TokenValidator {
	isValid(token: string | undefined): Promise<boolean>;
}

function createJwksClient(jwksUri: string): jwksRsa.JwksClient {
	return jwksRsa({
		cache: true,
		cacheMaxEntries: 5,
		cacheMaxAge: ONE_HOUR_MS,
		jwksUri,
	});
}

interface DiscoveryData {
	jwks_uri: string;
	issuer: string;
}

async function getJwksUrlFromDiscoveryEndpoint(discoveryUrl: string): Promise<DiscoveryData> {
	return axios.get(discoveryUrl)
		.then(res => {
			const discoveryData = res.data as DiscoveryData;
			const jwks_uri = discoveryData.jwks_uri;
			const issuer = discoveryData.issuer;

			if (!jwks_uri) {
				throw new Error('Could not find "jwks_uri" from discovery endpoint: ' + JSON.stringify(discoveryData));
			}

			if (!issuer) {
				throw new Error('Could not find "issuer" from discovery endpoint: ' + JSON.stringify(discoveryData));
			}

			return {
				jwks_uri,
				issuer
			};
		});
}

function createVerifyOptions(clientId: string, issuerUrl: string): VerifyOptions {
	return {
		audience: clientId,
		issuer: issuerUrl,
		algorithms: ['RS256']
	};
}

function createKeyRetriever(jwksClient: jwksRsa.JwksClient) {
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

const verifyJwtToken = (token: string, keyRetriever: GetPublicKeyOrSecret, verifyOptions: VerifyOptions): Promise<void> => {
	return new Promise((resolve, reject) => {
		verify(token, keyRetriever, verifyOptions, function(err: any) {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
};
