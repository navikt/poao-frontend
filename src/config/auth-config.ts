import { assert } from '../utils/assert.js';
import { toNullableEnumValue } from '../utils/config-utils.js';
import { logger } from '../utils/logger.js';
import { JsonConfig } from './app-config-resolver.js';

export enum LoginProviderType {
	ID_PORTEN = 'ID_PORTEN',
	AZURE_AD = 'AZURE_AD',
}

export enum OboProviderType {
	TOKEN_X = 'TOKEN_X',
	AZURE_AD = 'AZURE_AD',
}

export interface AuthConfig {
	loginProviderType: LoginProviderType;
	loginProvider: OAuthProvider;

	oboProviderType: OboProviderType;
	oboProvider: OAuthProvider;

	valkeyConfig?: ValkeyConfig
}

export interface ValkeyConfig {
	username: string,
	password: string,
	host: string,
	uri: string,
	port: string
}

export interface OAuthProvider {
	discoveryUrl: string;
	clientId: string;
	privateJwk: string;
}

export const logAuthConfig = (config: AuthConfig | undefined): void => {
	if (!config) return;

	const { loginProvider, loginProviderType, oboProviderType, oboProvider } = config;

	logger.info(`Auth config login: loginProviderType=${loginProviderType} discoverUrl=${loginProvider.discoveryUrl} clientId=${loginProvider.clientId}`);
	logger.info(`Auth config obo: oboProviderType=${oboProviderType} discoverUrl=${oboProvider.discoveryUrl} clientId=${oboProvider.clientId}`);
};

export const resolveAuthConfig = (authJsonConfig: JsonConfig.AuthConfig | undefined): AuthConfig | undefined => {
	const loginProvider = toNullableEnumValue(LoginProviderType, authJsonConfig?.loginProvider);

	if (!loginProvider) {
		return undefined;
	}

	if (loginProvider === LoginProviderType.AZURE_AD) {
		const azureAdProvider = resolveAzureAdProvider();
		const redisConfig = resolveValkeyConfig(authJsonConfig?.tokenCacheConfig)

		return {
			loginProviderType: LoginProviderType.AZURE_AD,
			loginProvider: azureAdProvider,
			oboProviderType: OboProviderType.AZURE_AD,
			oboProvider: azureAdProvider,
			valkeyConfig: redisConfig,
		}
	} else if (loginProvider === LoginProviderType.ID_PORTEN) {
		const idPortenProvider = resolveIdPortenProvider();
		const tokenXProvider = resolveTokenXProvider();
		const valkeyConfig = resolveValkeyConfig(authJsonConfig?.tokenCacheConfig)

		return {
			loginProviderType: LoginProviderType.ID_PORTEN,
			loginProvider: idPortenProvider,
			oboProviderType: OboProviderType.TOKEN_X,
			oboProvider: tokenXProvider,
			valkeyConfig
		}
	}

	throw new Error('Unable to resolve auth config, login provider is missing');
};

export const resolveAzureAdProvider = (): OAuthProvider => {
	const clientId = assert(process.env.AZURE_APP_CLIENT_ID, 'AZURE_APP_CLIENT_ID is missing');
	const discoveryUrl = assert(process.env.AZURE_APP_WELL_KNOWN_URL, 'AZURE_APP_WELL_KNOWN_URL is missing');
	const privateJwk = assert(process.env.AZURE_APP_JWK, 'AZURE_APP_JWK is missing');

	return { clientId, discoveryUrl, privateJwk };
};

const resolveIdPortenProvider = (): OAuthProvider => {
	const clientId = assert(process.env.IDPORTEN_CLIENT_ID, 'IDPORTEN_CLIENT_ID is missing');
	const discoveryUrl = assert(process.env.IDPORTEN_WELL_KNOWN_URL, 'IDPORTEN_WELL_KNOWN_URL is missing');
	const privateJwk = "dummyvalue"; // not used for idporten

	return { clientId, discoveryUrl, privateJwk };
};

const resolveTokenXProvider = (): OAuthProvider => {
	const clientId = assert(process.env.TOKEN_X_CLIENT_ID, 'TOKEN_X_CLIENT_ID is missing');
	const discoveryUrl = assert(process.env.TOKEN_X_WELL_KNOWN_URL, 'TOKEN_X_WELL_KNOWN_URL is missing');
	const privateJwk = assert(process.env.TOKEN_X_PRIVATE_JWK, 'TOKEN_X_PRIVATE_JWK is missing');

	return { clientId, discoveryUrl, privateJwk };
};

const resolveValkeyConfig = (valkeyConfig: JsonConfig.AuthConfig['tokenCacheConfig'] | undefined) => {
	if (!valkeyConfig) {
		return undefined;
	}

	const redisInstanceName = valkeyConfig.valkeyInstanceName.toLocaleUpperCase();

	const uri	 = assert(process.env['VALKEY_URI_' + redisInstanceName]) // The URI for the instance
	const host	 = assert(process.env['VALKEY_HOST_' + redisInstanceName]) // The host for the instance
	const port	 = assert(process.env['VALKEY_PORT_' + redisInstanceName]) // The port for the instance
	const username	 = assert(process.env['VALKEY_USERNAME_' + redisInstanceName]) // The username to use when connecting.
	const password	 = assert(process.env['VALKEY_PASSWORD_' + redisInstanceName]) // The password to use when connecting.

	return {
		uri,
		host,
		port,
		username,
		password
	}
}
