import jwksRsa, { RsaSigningKey } from 'jwks-rsa';
import axios from 'axios';
import { GetPublicKeyOrSecret, JwtHeader, JwtPayload, SigningKeyCallback, verify, VerifyOptions } from 'jsonwebtoken';
import { logger } from '../logger';
import { LoginProviderType } from '../../config/auth-config';
import { HttpsProxyAgent } from 'https-proxy-agent';

const proxyAgent = new HttpsProxyAgent({host: "webproxy.nais", port: "8088"});

const proxiedClient = axios.create({
	httpsAgent: proxyAgent,
	proxy: false
});

const ONE_HOUR_MS = 1000 * 60 * 60;

// Vi lager en egen enum for validator type siden det er godt mulig at det blir lagt til flere validatorer på sikt som f.eks for TokenX
export enum TokenValidatorType {
	ID_PORTEN, AZURE_AD
}

export function mapLoginProviderTypeToValidatorType(loginProviderType: LoginProviderType): TokenValidatorType {
	switch (loginProviderType) {
		case LoginProviderType.AZURE_AD:
			return TokenValidatorType.AZURE_AD;
		case LoginProviderType.ID_PORTEN:
			return TokenValidatorType.ID_PORTEN;
		default:
			throw new Error('Unknown loginProviderType ' + loginProviderType);
	}
}

export async function createTokenValidator(type: TokenValidatorType, discoverUrl: string, expectedAudience: string): Promise<TokenValidator> {
	const discoveryData = await getJwksUrlFromDiscoveryEndpoint(discoverUrl);
	const jwksClient = createJwksClient(discoveryData.jwks_uri);
	const keyRetriever = createKeyRetriever(jwksClient);
	const verifyOptions = type === TokenValidatorType.ID_PORTEN
		? createVerifyOptions(discoveryData.issuer, undefined) // ID-porten bruker "client_id" istedenfor "aud"
		: createVerifyOptions(discoveryData.issuer, expectedAudience);

	return {
		isValid: async (token: string | undefined): Promise<boolean> => {
			if (!token) {
				return false;
			}

			try {
				const verifiedToken = await verifyJwtToken(token, keyRetriever, verifyOptions);

				if (type == TokenValidatorType.ID_PORTEN) {
					const hasCorrectClientIdClaim = verifiedToken.client_id === expectedAudience;

					if (!hasCorrectClientIdClaim) {
						logger.error(`Expected "client_id" claim to equal ${expectedAudience}`);
						return false;
					}
				}

				return true;
			} catch (e) {
				logger.error('Failed to verify token', e);
				return false;
			}
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
	return proxiedClient.get(discoveryUrl)
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

function createVerifyOptions(issuerUrl: string, clientId?: string): VerifyOptions {
	return {
		algorithms: ['RS256'],
		issuer: issuerUrl,
		audience: clientId,
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

const verifyJwtToken = (token: string, keyRetriever: GetPublicKeyOrSecret, verifyOptions: VerifyOptions): Promise<JwtPayload> => {
	return new Promise((resolve, reject) => {
		verify(token, keyRetriever, verifyOptions, function(err, token) {
			if (!token || err) {
				reject(err);
			} else {
				resolve(token);
			}
		});
	});
};
