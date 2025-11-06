import { AuthConfig, LoginProviderType, OboProviderType } from "../../config/auth-config.js";
import { createTokenValidator } from "../auth/token-validator.js";
import { Request } from "express";
import { setOBOTokenOnRequest } from "../../middleware/obo-middleware.js";
import { logger } from "../logger.js";
import { JsonConfig } from "../../config/app-config-resolver.js";
import { AUTHORIZATION_HEADER } from "../auth/auth-token-utils.js";
import { CALL_ID, CONSUMER_ID } from "../../middleware/tracingMiddleware.js";
import { APP_NAME } from "../../config/base-config.js";
import { createTokenStore } from "../auth/tokenStore/token-store.js";

const createModiacontextHolderConfig = () => {
    const authConfig: AuthConfig = {
        loginProviderType: LoginProviderType.AZURE_AD,
        oboProviderType: OboProviderType.AZURE_AD,
        valkeyConfig: undefined,
    }
    const tokenValidator = createTokenValidator(authConfig.loginProviderType);
    return {
        tokenStore: createTokenStore(authConfig.valkeyConfig),
        authConfig,
        tokenValidator,
    }
}
type ModiaContextConfig = Awaited<ReturnType<typeof createModiacontextHolderConfig>>

let _config: ModiaContextConfig | undefined = undefined
const modiacontextHolderConfig = () => {
    if (_config === undefined) {
        _config = createModiacontextHolderConfig()
    }
    return _config
}


export const setModiaContext = async (req: Request, fnr: string, config: JsonConfig.ModiaContextHolderConfig) => {
    try {
        const { authConfig, tokenValidator, tokenStore } = modiacontextHolderConfig()
        const error = await setOBOTokenOnRequest(req, tokenValidator, tokenStore, authConfig.oboProviderType, config.scope)
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
