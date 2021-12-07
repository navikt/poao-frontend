import { assert, strToEnum } from '../utils';
import { logger } from '../utils/logger';
import { JsonData } from '../utils/json-utils';

export enum LoginOidcProviderType {
	ID_PORTEN = 'ID_PORTEN',
	AZURE_AD = 'AZURE_AD',
}

export enum OboOidcProviderType {
	TOKEN_X = 'TOKEN_X',
	AZURE_AD = 'AZURE_AD',
}

export interface AuthConfig {
	loginOidcProviderType: LoginOidcProviderType;
	loginOidcProvider: OidcProvider;

	oboOidcProviderType: OboOidcProviderType;
	oboOidcProvider: OidcProvider;
}

export interface OidcProvider {
	discoveryUrl: string;
	clientId: string;
	privateJwk: string;
}

export const logAuthConfig = (config: AuthConfig | undefined): void => {
	if (!config) return;

	const { loginOidcProvider, loginOidcProviderType, oboOidcProviderType, oboOidcProvider } = config;

	logger.info(`Auth config login: loginOidcProviderType=${loginOidcProviderType} discoverUrl=${loginOidcProvider.discoveryUrl} clientId=${loginOidcProvider.clientId}`);
	logger.info(`Auth config obo: oboOidcProviderType=${oboOidcProviderType} discoverUrl=${oboOidcProvider.discoveryUrl} clientId=${oboOidcProvider.clientId}`);
};

export const resolveAuthConfig = (jsonConfig: JsonData | undefined): AuthConfig | undefined => {
	if (!jsonConfig) return undefined;

	const loginProvider = strToEnum(jsonConfig.loginProvider, LoginOidcProviderType);

	if (loginProvider === LoginOidcProviderType.AZURE_AD) {
		const azureAdOidProvider = resolveAzureAdLoginProviderConfig();

		return {
			loginOidcProviderType: LoginOidcProviderType.AZURE_AD,
			loginOidcProvider: azureAdOidProvider,
			oboOidcProviderType: OboOidcProviderType.AZURE_AD,
			oboOidcProvider: azureAdOidProvider
		}
	} else if (loginProvider === LoginOidcProviderType.ID_PORTEN) {
		const idPortenOidcProvider = resolveIdPortenLoginProviderConfig();
		const tokenXOidcProvider = resolveTokenXConfig();

		return {
			loginOidcProviderType: LoginOidcProviderType.ID_PORTEN,
			loginOidcProvider: idPortenOidcProvider,
			oboOidcProviderType: OboOidcProviderType.TOKEN_X,
			oboOidcProvider: tokenXOidcProvider
		}
	}

	throw new Error('Unable to resolve auth config, login provider is missing');
};

const resolveAzureAdLoginProviderConfig = (): OidcProvider => {
	const clientId = assert(process.env.AZURE_APP_CLIENT_ID, 'AZURE_APP_CLIENT_ID is missing');
	const discoveryUrl = assert(process.env.AZURE_APP_WELL_KNOWN_URL, 'AZURE_APP_WELL_KNOWN_URL is missing');
	const jwk = assert(process.env.AZURE_APP_JWK, 'AZURE_APP_JWK is missing');

	return { clientId, discoveryUrl, privateJwk: jwk };
};

const resolveIdPortenLoginProviderConfig = (): OidcProvider => {
	const clientId = assert(process.env.IDPORTEN_CLIENT_ID, 'IDPORTEN_CLIENT_ID is missing');
	const discoveryUrl = assert(process.env.IDPORTEN_WELL_KNOWN_URL, 'IDPORTEN_WELL_KNOWN_URL is missing');
	const jwk = assert(process.env.IDPORTEN_CLIENT_JWK, 'IDPORTEN_CLIENT_JWK is missing');

	return { clientId, discoveryUrl, privateJwk: jwk };
};

const resolveTokenXConfig = (): OidcProvider => {
	const clientId = assert(process.env.TOKEN_X_CLIENT_ID, 'TOKEN_X_CLIENT_ID is missing');
	const discoveryUrl = assert(process.env.TOKEN_X_WELL_KNOWN_URL, 'TOKEN_X_WELL_KNOWN_URL is missing');
	const privateJwk = assert(process.env.TOKEN_X_PRIVATE_JWK, 'TOKEN_X_PRIVATE_JWK is missing');

	return { clientId, discoveryUrl, privateJwk };
};
