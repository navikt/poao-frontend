import { TokenSet } from 'openid-client';
import { assert } from '../assert.js';
import { Request } from 'express';
import { JsonData } from '../config-utils.js';
import { fromBase64 } from '../utils.js';
import { secureLog } from '../logger.js';

export const AUTHORIZATION_HEADER = 'authorization';

export const WONDERWALL_ID_TOKEN_HEADER = 'x-wonderwall-id-token';

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
export function getAccessToken(req: Request): string | undefined {
	const header = req.header(AUTHORIZATION_HEADER);
	return header?.split(' ')[1];
}

export function extractTokenPayload(jwtToken: string): JsonData {
	try {
		const payload = fromBase64(jwtToken.split('.')[1]);
		return JSON.parse(payload);
	} catch (e) {
		secureLog.error(`Unable to extract token payload from token: ${jwtToken}, error: ${e}`);
		throw e;
	}
}

export function getTokenSubject(jwtToken: string): string | undefined {
	return extractTokenPayload(jwtToken).sub;
}