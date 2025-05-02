import { ValkeyConfig } from "../../../config/auth-config.js";
import { OboToken } from "../auth-token-utils.js";
import { createValkeyCache } from "./valkey-token-store.js";
import { createInMemoryCache } from "./in-memory-token-store.js";

export function createTokenStore(valkeyConfig: ValkeyConfig | undefined): OboTokenStore {
    if (valkeyConfig) {
        return createValkeyCache(valkeyConfig)
    } else {
        return createInMemoryCache()
    }
}

export function createOboTokenKey(userId: string, appIdentifier: string): string {
    return `${userId}_${appIdentifier}`;
}

export interface OboTokenStore {
    getUserOboToken: (userId: string, appIdentifier: string) => Promise<OboToken | undefined>;
    setUserOboToken: (userId: string, appIdentifier: string, expiresInSeconds: number, oboToken: OboToken) => Promise<void>;
    deleteUserOboToken: (userId: string, appIdentifier: string) => Promise<void>;
    close: () => Promise<void>;
    cacheType: 'in-memory' | 'valkey';
}