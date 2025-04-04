import {OboToken} from '../auth-token-utils.js';
import NodeCache from 'node-cache';
import {minutesToSeconds} from '../../utils.js';
import {logger} from "../../logger.js";
import {OboTokenStore} from "./token-store.js";

function createOboTokenKey(userId: string, appIdentifier: string): string {
	return `${userId}_${appIdentifier}`;
}

export const createInMemoryCache = (): OboTokenStore => {
	const cache = new NodeCache({
		stdTTL: minutesToSeconds(55)
	});

	return {
		getUserOboToken: async (userId: string, appIdentifier: string): Promise<OboToken | undefined> => {
			try {
				return cache.get(createOboTokenKey(userId, appIdentifier))
			} catch (e) {
				logger.warn("Failed to get OboToken from in-memory cache", e)
				return undefined
			}
		},
		setUserOboToken: async (userId: string, appIdentifier: string, expiresInSeconds: number, oboToken: OboToken) => {
			try {
				cache.set(createOboTokenKey(userId, appIdentifier), oboToken, expiresInSeconds)
			} catch (e) {
				logger.warn("Failed to set OboToken in in-memory cache", e)
			}
		},
		deleteUserOboToken: async (userId: string, appIdentifier: string) => {
			try {
				cache.del(createOboTokenKey(userId, appIdentifier))
			} catch (e) {
				logger.warn("Failed to delete OboToken from in-memory cache", e)
			}
		},

		close: async () => {},
		cacheType: 'in-memory'
	}
}
