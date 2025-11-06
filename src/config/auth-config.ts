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

export type AuthConfig = {
	loginProviderType: LoginProviderType.ID_PORTEN;
	oboProviderType: OboProviderType.TOKEN_X;
	valkeyConfig?: ValkeyConfig
} | {
    loginProviderType: LoginProviderType.AZURE_AD;
    oboProviderType: OboProviderType.AZURE_AD;
    valkeyConfig?: ValkeyConfig
}

export interface ValkeyConfig {
	username: string,
	password: string,
	host: string,
	uri: string,
	port: string
}

export const logAuthConfig = (config: AuthConfig | undefined): void => {
	if (!config) return;

	const { loginProviderType, oboProviderType} = config;

	logger.info(`Auth config login: loginProviderType=${loginProviderType}`);
	logger.info(`Auth config obo: oboProviderType=${oboProviderType}`);
};

export const resolveAuthConfig = (authJsonConfig: JsonConfig.AuthConfig | undefined): AuthConfig | undefined => {
	const loginProvider = toNullableEnumValue(LoginProviderType, authJsonConfig?.loginProvider);

	if (!loginProvider) {
		return undefined;
	}

    const valkeyConfig = resolveValkeyConfig(authJsonConfig?.tokenCacheConfig)

    if (loginProvider === LoginProviderType.AZURE_AD) {
		return {
			loginProviderType: LoginProviderType.AZURE_AD,
			oboProviderType: OboProviderType.AZURE_AD,
			valkeyConfig,
		}
	} else if (loginProvider === LoginProviderType.ID_PORTEN) {
		return {
			loginProviderType: LoginProviderType.ID_PORTEN,
			oboProviderType: OboProviderType.TOKEN_X,
			valkeyConfig
		}
	}

	throw new Error('Unable to resolve auth config, login provider is missing');
};

const resolveValkeyConfig = (valkeyConfig: JsonConfig.AuthConfig['tokenCacheConfig'] | undefined) => {
	if (!valkeyConfig) {
		return undefined;
	}

	const redisInstanceName = valkeyConfig.valkeyInstanceName.toLocaleUpperCase();

	const uri = assert(process.env['VALKEY_URI_' + redisInstanceName]) // The URI for the instance
	const host = assert(process.env['VALKEY_HOST_' + redisInstanceName]) // The host for the instance
	const port = assert(process.env['VALKEY_PORT_' + redisInstanceName]) // The port for the instance
	const username = assert(process.env['VALKEY_USERNAME_' + redisInstanceName]) // The username to use when connecting.
	const password = assert(process.env['VALKEY_PASSWORD_' + redisInstanceName]) // The password to use when connecting.

	return {
		uri,
		host,
		port,
		username,
		password
	}
}
