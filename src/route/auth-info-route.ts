import { Request, Response } from 'express';
import { TokenValidator } from '../utils/auth/token-validator.js';
import { extractTokenPayload, getAccessToken } from '../utils/auth/auth-token-utils.js';

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

export function authInfoRoute(validator: TokenValidator) {
	return (req: Request, res: Response) => {
		const token = getAccessToken(req);

		if (!token) {
			res.send(authInfoNotAuthenticated);
		} else {
			validator.isValid(token)
				.then((isValid) => {
					if (!isValid) {
						res.send(authInfoNotAuthenticated);
						return;
					}

					const payload = extractTokenPayload(token);
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
				})
		}
	}
}