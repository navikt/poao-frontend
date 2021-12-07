import { TokenSet } from 'openid-client';
import { assert } from '../index';
import { Request } from 'express';

const AUTHORIZATION_HEADER = 'Authorization';

// The tokens should be considered expired a bit before the actual expiration.
// This is to prevent problems with clock skew and that the token might expire in-flight.
export const EXPIRE_BEFORE_SECONDS = 15;

export interface OboToken {
	tokenType: string; // Always "Bearer"
	scope: string; // Scopes (permissions) that the OBO token has
	expiresAt: number; // Epoch seconds timestamp for expiration
	accessToken: string; // The OBO token
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

export function getAccessToken(req: Request): string | undefined {
	return req.header(AUTHORIZATION_HEADER);
}