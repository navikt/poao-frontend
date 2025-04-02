import {OboToken} from '../auth-token-utils.js';
import NodeCache from 'node-cache';
import {minutesToSeconds} from '../../utils.js';

function createOboTokenKey(userId: string, appIdentifier: string): string {
	return `${userId}_${appIdentifier}`;
}

export const createInMemoryCache = () => {
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
		deleteUserOboToken: async (userId: string, appIdentifier: string) => {
			cache.del(createOboTokenKey(userId, appIdentifier))
		}
	}
}
