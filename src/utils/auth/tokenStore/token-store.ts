import crypto from "crypto";
import { ValkeyConfig } from "../../../config/auth-config.js";
import { createInMemoryCache } from "./in-memory-token-store.js";
import { createValkeyCache } from "./valkey-token-store.js";

export type OboTokenKey = `${string}_${string}`;

export function createOboTokenKey(token: string, appIdentifier: string): OboTokenKey {
    const tokenHash = crypto.createHash('sha256').update(token, 'utf8').digest('hex');
    return `${tokenHash}_${appIdentifier}`;
}

export function createTokenStore(valkeyConfig: ValkeyConfig | undefined): OboTokenStore {
    if (valkeyConfig) {
        return createValkeyCache(valkeyConfig)
    } else {
        return createInMemoryCache()
    }
}

export interface OboTokenStore {
    getUserOboToken: (key: OboTokenKey) => Promise<string | undefined>;
    setUserOboToken: (key: OboTokenKey, expiresInSeconds: number, oboToken: string) => Promise<void>;
    deleteUserOboToken: (key: OboTokenKey) => Promise<void>;
    close: () => Promise<void>;
    cacheType: 'in-memory' | 'valkey';
}