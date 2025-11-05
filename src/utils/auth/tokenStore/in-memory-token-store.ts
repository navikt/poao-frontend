import NodeCache from 'node-cache';
import { logger } from "../../logger.js";
import { minutesToSeconds } from '../../utils.js';
import { OboTokenStore, OboTokenKey } from "./token-store.js";

export const createInMemoryCache = (): OboTokenStore => {
	const cache = new NodeCache({
		stdTTL: minutesToSeconds(55)
	});

	return {
		getUserOboToken: async (key: OboTokenKey): Promise<string | undefined> => {
			try {
				return cache.get(key)
			} catch (e) {
				logger.warn("Failed to get OboToken from in-memory cache", e)
				return undefined
			}
		},
		setUserOboToken: async (key: OboTokenKey, expiresInSeconds: number, oboToken: string) => {
			try {
				cache.set(key, oboToken, expiresInSeconds)
			} catch (e) {
				logger.warn("Failed to set OboToken in in-memory cache", e)
			}
		},
		deleteUserOboToken: async (key: OboTokenKey) => {
			try {
				cache.del(key)
			} catch (e) {
				logger.warn("Failed to delete OboToken from in-memory cache", e)
			}
		},

		close: async () => {},
		cacheType: 'in-memory'
	}
}
