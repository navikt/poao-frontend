import type {JWTPayload, JWTVerifyOptions} from 'jose'
import {jwtVerify, createRemoteJWKSet} from 'jose'
import {LoginProviderType} from '../../config/auth-config.js'
import {logger, secureLog} from '../logger.js'

const ONE_HOUR_MS = 1000 * 60 * 60
const JWKS_TIMEOUT_MS = 5000

export enum TokenValidatorType {
    ID_PORTEN, AZURE_AD
}

export function mapLoginProviderTypeToValidatorType(loginProviderType: LoginProviderType): TokenValidatorType {
    switch (loginProviderType) {
        case LoginProviderType.AZURE_AD:
            return TokenValidatorType.AZURE_AD
        case LoginProviderType.ID_PORTEN:
            return TokenValidatorType.ID_PORTEN
        default:
            throw new Error('Unknown loginProviderType ' + loginProviderType)
    }
}

export async function createTokenValidator(type: TokenValidatorType, discoverUrl: string, expectedAudience: string): Promise<TokenValidator> {
    const discoveryData = await getJwksUrlFromDiscoveryEndpoint(discoverUrl)
    const JWKS = createRemoteJwks(discoveryData.jwks_uri)
    const verifyOptions = type === TokenValidatorType.ID_PORTEN
        ? createVerifyOptions(discoveryData.issuer, undefined)
        : createVerifyOptions(discoveryData.issuer, expectedAudience)

    return {
        isValid: async (token: string | undefined): Promise<boolean> => {
            if (!token) {
                return false
            }

            try {
                const verifiedToken = await verifyJwtToken(token, JWKS, verifyOptions)

                if (type == TokenValidatorType.ID_PORTEN) {
                    const hasCorrectClientIdClaim = verifiedToken.client_id === expectedAudience

                    if (!hasCorrectClientIdClaim) {
                        logger.error(`Expected "client_id" claim to equal ${expectedAudience}`)
                        return false
                    }
                }

                return true
            } catch (e) {
                logger.error('Failed to verify token', e)
                secureLog.error('Failed to verify token: ' + token)
                return false
            }
        }
    }
}

export interface TokenValidator {
    isValid(token: string | undefined): Promise<boolean>
}

const createRemoteJwks = (jwksUri: string) =>
    createRemoteJWKSet(new URL(jwksUri), {
        timeoutDuration: JWKS_TIMEOUT_MS,
        cacheMaxAge: ONE_HOUR_MS,
    })

interface DiscoveryData {
    jwks_uri: string
    issuer: string
}

export async function getJwksUrlFromDiscoveryEndpoint(discoveryUrl: string): Promise<DiscoveryData> {
    const res = await fetch(discoveryUrl)
    if (!res.ok) {
        throw new Error(`Received unexpected status ${res.status} from ${discoveryUrl}`)
    }

    const data = await res.json() as DiscoveryData
    const {jwks_uri, issuer} = data

    if (!jwks_uri) {
        throw new Error('Could not find "jwks_uri" from discovery endpoint: ' + JSON.stringify(data))
    }

    if (!issuer) {
        throw new Error('Could not find "issuer" from discovery endpoint: ' + JSON.stringify(data))
    }

    return {jwks_uri, issuer}
}

const createVerifyOptions = (issuerUrl: string, clientId?: string): JWTVerifyOptions => ({
    algorithms: ['RS256'],
    issuer: issuerUrl,
    audience: clientId,
})

const verifyJwtToken = async (token: string, JWKS: ReturnType<typeof createRemoteJwks>, verifyOptions: ReturnType<typeof createVerifyOptions>): Promise<JWTPayload> => {
    const {payload} = await jwtVerify(token, JWKS, verifyOptions)
    return payload
}