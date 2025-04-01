import {OboToken, OboTokenStore} from './auth-token-utils.js';
import NodeCache from 'node-cache';
import {minutesToSeconds} from '../utils.js';
import {RedisConfig} from "../../config/auth-config.js";
import {Redis, RedisOptions} from 'iovalkey'

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

const configureRedis = (redisConfig: RedisConfig) => {
	const options: RedisOptions = {
		host: redisConfig.host,
		port: Number(redisConfig.port),
		password: redisConfig.password,
		username: redisConfig.username,
	}
	return new Redis(options)
}

const createRedisCache = (redisConfig: RedisConfig): OboTokenStore => {
	const redis = configureRedis(redisConfig)
	return {
		getUserOboToken: async (userId: string, appIdentifier: string): Promise<OboToken | undefined> => {
			return redis.get(createOboTokenKey(userId, appIdentifier))
				.then(result => {
					if (result) {
						return JSON.parse(result) as OboToken
					}
					return undefined
				})
		},
		setUserOboToken: async (userId: string, appIdentifier: string, expiresInSeconds: number, oboToken: OboToken) => {
			await redis.setex(createOboTokenKey(userId, appIdentifier), JSON.stringify(oboToken), expiresInSeconds)
		},
	}
}

export function createTokenStore(redisConfig: RedisConfig | undefined): OboTokenStore {
	if (redisConfig) {
		return createRedisCache(redisConfig)
	} else {
		return createInMemoryCache()
	}
}