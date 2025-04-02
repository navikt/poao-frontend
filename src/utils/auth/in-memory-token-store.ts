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
	}
}

const configureRedis = (redisConfig: ValkeyConfig) => {
	const options: RedisOptions = {
		host: redisConfig.host,
		port: Number(redisConfig.port),
		password: redisConfig.password,
		username: redisConfig.username,
	}
	return new Redis(options)
}

const createRedisCache = (redisConfig: ValkeyConfig): OboTokenStore => {
	const redis = configureRedis(redisConfig)
	return {
		getUserOboToken: async (userId: string, appIdentifier: string): Promise<OboToken | undefined> => {
			return redis.get(createOboTokenKey(userId, appIdentifier))
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
			await redis.setex(createOboTokenKey(userId, appIdentifier), JSON.stringify(oboToken), expiresInSeconds)
		},
	}
}

export function createTokenStore(redisConfig: ValkeyConfig | undefined): OboTokenStore {
	if (redisConfig) {
		return createRedisCache(redisConfig)
	} else {
		return createInMemoryCache()
	}
}