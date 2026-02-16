import { Request } from 'express';
import { JsonData } from '../config-utils.js';
import { fromBase64 } from '../utils.js';
import { logger } from "../logger.js";

export const AUTHORIZATION_HEADER = 'authorization';

export const WONDERWALL_ID_TOKEN_HEADER = 'x-wonderwall-id-token';

// The tokens should be considered expired a bit before the actual expiration.
// This is to prevent problems with clock skew and that the token might expire in-flight.
export const EXPIRE_BEFORE_SECONDS = 30;

export const getExpiresInSecondWithClockSkew = (expiresInSeconds: number): number => {
	return Math.max(1, expiresInSeconds - EXPIRE_BEFORE_SECONDS);
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
		logger.error(`Unable to extract token payload from token, error: ${e}`);
		throw e;
	}
}
