import { OboToken, OboTokenStore } from './auth-token-utils';
import NodeCache from 'node-cache';
import { minutesToSeconds } from '../utils';

function createOboTokenKey(sessionId: string, appIdentifier: string): string {
	return `${sessionId}_${appIdentifier}`;
}

export function createTokenStore(): OboTokenStore {
	const cache = new NodeCache({
		stdTTL: minutesToSeconds(55)
	});

	return {
		getUserOboToken: async (sessionId: string, appIdentifier: string): Promise<OboToken | undefined> => {
			return cache.get(createOboTokenKey(sessionId, appIdentifier))
		},
		setUserOboToken: async (sessionId: string, appIdentifier: string, expiresInSeconds: number, oboToken: OboToken) => {
			cache.set(createOboTokenKey(sessionId, appIdentifier), oboToken, expiresInSeconds)
		},
	}
}