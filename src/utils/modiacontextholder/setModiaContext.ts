import {LoginProviderType, OboProviderType, resolveAzureAdProvider} from "../../config/auth-config";
import {createTokenValidator, mapLoginProviderTypeToValidatorType} from "../auth/token-validator";
import {createClient, createIssuer} from "../auth/auth-client-utils";
import {createJWKS} from "../auth/auth-config-utils";
import {createTokenStore} from "../auth/in-memory-token-store";
import {Request} from "express";
import {setOBOTokenOnRequest} from "../../middleware/obo-middleware";
import {logger} from "../logger";
import {JsonConfig} from "../../config/app-config-resolver";
import ModiaContextHolderConfig = JsonConfig.ModiaContextHolderConfig;
import {AUTHORIZATION_HEADER} from "../auth/auth-token-utils";

const azureAdProvider = resolveAzureAdProvider()
const createModiacontextHolderConfig = async () => {
    const authConfig = {
        loginProviderType: LoginProviderType.AZURE_AD,
        loginProvider: azureAdProvider,
        oboProviderType: OboProviderType.AZURE_AD,
        oboProvider: azureAdProvider
    }
    const tokenValidatorType = mapLoginProviderTypeToValidatorType(authConfig.loginProviderType);
    const tokenValidator = await createTokenValidator(tokenValidatorType, authConfig.loginProvider.discoveryUrl, authConfig.loginProvider.clientId);
    const oboIssuer = await createIssuer(authConfig.oboProvider.discoveryUrl);
    const oboTokenClient = createClient(oboIssuer, authConfig.oboProvider.clientId, createJWKS(authConfig.oboProvider.privateJwk));
    return {
        tokenStore: createTokenStore(),
        authConfig,
        tokenValidator,
        oboTokenClient,
    }
}
const modiacontextHolderConfig = createModiacontextHolderConfig()

export const setModiaContext = async (req: Request, fnr: string, config: ModiaContextHolderConfig) => {
    const { authConfig, tokenValidator, tokenStore, oboTokenClient } = await modiacontextHolderConfig
    const error = await setOBOTokenOnRequest(req, tokenValidator, oboTokenClient, tokenStore, authConfig , config.scope)
    if (error) return error
    logger.info('Setting modia context before redirecting');
    const result = await fetch(`${config.url}/api/context`, {
        method: "POST",
        headers: {
            ['x_consumerId']: process.env['NAIS_APP_NAME'],
            ['x_callId']: req.headers['x_callId'],
            [AUTHORIZATION_HEADER]: req.headers[AUTHORIZATION_HEADER],
        } as HeadersInit,
        body: JSON.stringify({
            eventType: "NY_AKTIV_BRUKER",
            verdi: fnr,
        })
    })
    if (result.ok) return
    const failBody = await result.text()
    logger.error(`Failed to update modiacontextholder status=${result.status}, body=${failBody}`)
    return { status: result.status }
}