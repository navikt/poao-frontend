import {OboToken, OboTokenStore} from './auth-token-utils.js';
import NodeCache from 'node-cache';
import {minutesToSeconds} from '../utils.js';
import {ValkeyConfig} from "../../config/auth-config.js";
import {Redis, RedisOptions} from 'iovalkey'
import {logger} from "../logger.js";

function createOboTokenKey(userId: string, appIdentifier: string): string {
	return `${userId}_${appIdentifier}`;
}

const createInMemoryCache = () => {
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

const configureValkey = (valkeyConfig: ValkeyConfig) => {
	const options: RedisOptions = {
		tls: {
			host: valkeyConfig.host,
			port: Number(valkeyConfig.port),
		},
		password: valkeyConfig.password,
		username: valkeyConfig.username,
		maxRetriesPerRequest: 3
	}
	return new Redis(options)
}

const createValkeyCache = (valkeyConfig: ValkeyConfig): OboTokenStore => {
	const valkey = configureValkey(valkeyConfig)
	return {
		getUserOboToken: async (userId: string, appIdentifier: string): Promise<OboToken | undefined> => {
			return valkey.get(createOboTokenKey(userId, appIdentifier))
				.then(result => {
					try {
						if (result) {
							return JSON.parse(result) as OboToken
						} else {
							return undefined
						}
					} catch (e) {
						logger.error("Error parsing OboToken from Valkey", e)
						return undefined
					}
				})
				.catch((error) => {
					logger.error("Error getting OboToken from Valkey", error)
					return undefined
				})
		},
		setUserOboToken: async (userId: string, appIdentifier: string, expiresInSeconds: number, oboToken: OboToken) => {
			try {
				await valkey.setex(createOboTokenKey(userId, appIdentifier), JSON.stringify(oboToken), expiresInSeconds)
			} catch (e) {
				logger.error("Error setting OboToken in Valkey", e)
			}
		},
		deleteUserOboToken: async (userId: string, appIdentifier: string) => {
			try {
				await valkey.del(createOboTokenKey(userId, appIdentifier))
			} catch (e) {
				logger.error("Error deleting OboToken from Valkey", e)
			}
		},
	}
}

export function createTokenStore(valkeyConfig: ValkeyConfig | undefined): OboTokenStore {
	if (valkeyConfig) {
		return createValkeyCache(valkeyConfig)
	} else {
		return createInMemoryCache()
	}
}