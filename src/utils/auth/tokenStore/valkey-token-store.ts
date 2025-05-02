import { ValkeyConfig } from "../../../config/auth-config.js";
import { Redis, RedisOptions } from "iovalkey";
import { OboToken } from "../auth-token-utils.js";
import { logger } from "../../logger.js";
import { createOboTokenKey, OboTokenStore } from "./token-store.js";

export const configureValkey = (valkeyConfig: ValkeyConfig) => {
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

export const createValkeyCache = (valkeyConfig: ValkeyConfig): OboTokenStore => {
    const valkey = configureValkey(valkeyConfig)
    return {
        getUserOboToken: async (userId: string, appIdentifier: string): Promise<OboToken | undefined> => {
            return valkey.get(createOboTokenKey(userId, appIdentifier))
                .then(result => {
                    try {
                        if (result) {
                            return { accessToken: result } as OboToken
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
                await valkey.setex(createOboTokenKey(userId, appIdentifier), expiresInSeconds, oboToken.accessToken)
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
        close: async () => {
            try {
                await valkey.quit()
            } catch (e) {
                logger.error("Error closing Valkey connection", e)
            }
        },
        cacheType: 'valkey'
    }
}