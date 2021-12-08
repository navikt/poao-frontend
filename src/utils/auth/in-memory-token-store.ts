import { OboToken, OboTokenStore } from './auth-token-utils';
import NodeCache from 'node-cache';
import { minutesToSeconds } from '../utils';

function createOboTokenKey(userId: string, appIdentifier: string): string {
	return `${userId}_${appIdentifier}`;
}

export function createTokenStore(): OboTokenStore {
	const cache = new NodeCache({
		stdTTL: minutesToSeconds(55)
	});

	return {
		getUserOboToken: async (userId: string, appIdentifier: string): Promise<OboToken | undefined> => {
			return cache.get(createOboTokenKey(userId, appIdentifier))
		},
		setUserOboToken: async (userId: string, appIdentifier: string, expiresInSeconds: number, oboToken: OboToken) => {
			cache.set(createOboTokenKey(userId, appIdentifier), oboToken, expiresInSeconds)
		},
	}
}