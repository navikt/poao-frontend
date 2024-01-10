import type {
	GetPublicKeyOrSecret,
	JwtHeader,
	JwtPayload,
	SigningKeyCallback,
	VerifyOptions
} from 'jsonwebtoken';
import jsonwebtoken from 'jsonwebtoken';
import jwksRsa, { RsaSigningKey } from 'jwks-rsa';
import { LoginProviderType } from '../../config/auth-config.js';
import { logger, secureLog } from '../logger.js';

const ONE_HOUR_MS = 1000 * 60 * 60;

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
				secureLog.error('Failed to verify token: ' + token)
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

export async function getJwksUrlFromDiscoveryEndpoint(discoveryUrl: string): Promise<DiscoveryData> {
	const res = await fetch(discoveryUrl);
	if (!res.ok) {
		throw new Error(`Received unexpected status ${res.status} from ${discoveryUrl}`);
	}

	const data = await res.json() as DiscoveryData;
	const { jwks_uri, issuer } = data;

	if (!jwks_uri) {
		throw new Error('Could not find "jwks_uri" from discovery endpoint: ' + JSON.stringify(data));
	}

	if (!issuer) {
		throw new Error('Could not find "issuer" from discovery endpoint: ' + JSON.stringify(data));
	}

	return { jwks_uri, issuer };
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

		jwksClient.getSigningKey(header.kid, function (_err, key) {
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
		jsonwebtoken.verify(token, keyRetriever, { ...verifyOptions, complete: true }, (err, token) => {
			if (!token || err) {
				reject(err);
			} else {
				if (typeof token.payload === 'string') {
					reject(new Error('Expected token.payload to be of type JwtPayload but was string'))
				} else {
					resolve(token.payload);
				}
			}
		});
	});
};
