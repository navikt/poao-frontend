import { TokenSet } from 'openid-client';
import { assert } from '../index';
import { JsonData } from '../json-utils';
import { fromBase64 } from '../utils';
import { IncomingHttpHeaders } from 'http';

// The tokens should be considered expired a bit before the actual expiration.
// This is to prevent problems with clock skew and that the token might expire in-flight.
export const EXPIRE_BEFORE_SECONDS = 30;

export interface OboToken {
	tokenType: string; // Always "Bearer"
	scope: string; // Scopes (permissions) that the OBO token has
	expiresAt: number; // Epoch seconds timestamp for expiration
	accessToken: string; // The OBO token
}

export interface OboTokenStore {
	getUserOboToken: (userId: string, appIdentifier: string) => Promise<OboToken | undefined>;
	setUserOboToken: (userId: string, appIdentifier: string, expiresInSeconds: number, oboToken: OboToken) => Promise<void>;
}

export const getExpiresInSecondWithClockSkew = (expiresInSeconds: number): number => {
	return expiresInSeconds - EXPIRE_BEFORE_SECONDS;
};

export const createNbf = (): number => {
	return Math.floor(Date.now() / 1000);
};

export const tokenSetToOboToken = (tokenSet: TokenSet): OboToken => {
	return {
		tokenType: assert(tokenSet.token_type, 'Missing token_type'),
		scope: assert(tokenSet.scope, 'Missing scope'),
		expiresAt: assert(tokenSet.expires_at, 'Missing expires_at'),
		accessToken: assert(tokenSet.access_token, 'Missing access_token'),
	};
};

// The header should contain a value in the following format: "Bearer <token>"
export function getAccessToken(headers: IncomingHttpHeaders): string | undefined {
	return headers.authorization?.split(' ')[1];
}

export function extractTokenPayload(jwtToken: string): JsonData {
	const payload = fromBase64(jwtToken.split('.')[1]);
	return JSON.parse(payload);
}

export function getTokenSubject(jwtToken: string): string | undefined {
	return extractTokenPayload(jwtToken).sub;
}