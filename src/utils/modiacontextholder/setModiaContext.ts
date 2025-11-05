import { LoginProviderType, OboProviderType, resolveAzureAdProvider } from "../../config/auth-config.js";
import { createTokenValidator, mapLoginProviderTypeToValidatorType } from "../auth/token-validator.js";
import { Request } from "express";
import { setOBOTokenOnRequest } from "../../middleware/obo-middleware.js";
import { logger } from "../logger.js";
import { JsonConfig } from "../../config/app-config-resolver.js";
import { AUTHORIZATION_HEADER } from "../auth/auth-token-utils.js";
import { CALL_ID, CONSUMER_ID } from "../../middleware/tracingMiddleware.js";
import { APP_NAME } from "../../config/base-config.js";
import { createTokenStore } from "../auth/tokenStore/token-store.js";

const createModiacontextHolderConfig = async () => {
    const azureAdProvider = resolveAzureAdProvider()
    const authConfig = {
        loginProviderType: LoginProviderType.AZURE_AD,
        loginProvider: azureAdProvider,
        oboProviderType: OboProviderType.AZURE_AD,
        oboProvider: azureAdProvider
    }
    const tokenValidatorType = mapLoginProviderTypeToValidatorType(authConfig.loginProviderType);
    const tokenValidator = await createTokenValidator(tokenValidatorType, authConfig.loginProvider.discoveryUrl, authConfig.loginProvider.clientId);
    return {
        tokenStore: createTokenStore(undefined),
        authConfig,
        tokenValidator,
    }
}
type ModiaContextConfig = Awaited<ReturnType<typeof createModiacontextHolderConfig>>

let _config: ModiaContextConfig | undefined = undefined
const modiacontextHolderConfig = async () => {
    if (_config === undefined) {
        _config = await createModiacontextHolderConfig()
    }
    return _config
}


export const setModiaContext = async (req: Request, fnr: string, config: JsonConfig.ModiaContextHolderConfig) => {
    try {
        const { authConfig, tokenValidator, tokenStore } = await modiacontextHolderConfig()
        const error = await setOBOTokenOnRequest(req, tokenValidator, tokenStore, authConfig, config.scope)
        if (error) return error
        logger.info({
            message: 'Setting modia context before redirecting',
            redirectedOrigin: req.headers["origin"],
            redirectedReferer: req.headers["referer"]?.replace(/\d{11}/g, '<fnr>')
        });
        const result = await fetch(`${config.url}/api/context`, {
            method: "POST",
            headers: {
                ['Content-Type']: 'application/json',
                [CONSUMER_ID]: APP_NAME,
                [CALL_ID]: req.headers[CALL_ID],
                [AUTHORIZATION_HEADER]: req.headers[AUTHORIZATION_HEADER],
            } as HeadersInit,
            body: JSON.stringify({
                eventType: "NY_AKTIV_BRUKER",
                verdi: fnr,
            })
        })
        if (result.ok) return
        const failBody = await result.text()
        logger.error({
            message: `Failed to update modiacontextholder status=${result.status}, body=${failBody}`,
            callId: req.headers[CALL_ID],
            consumerId: req.headers[CONSUMER_ID]
        })
        return { status: result.status }
    } catch (err) {
        return { status: 500, message: JSON.stringify(err) }
    }
}
