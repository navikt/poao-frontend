import merge from 'lodash.merge';

import { assert, strToEnum } from '../utils';
import { logger } from '../utils/logger';
import { JsonData } from '../utils/json-utils';

export enum OboTokenProvider {
	TOKEN_X = 'TOKEN_X',
	AZURE_AD = 'AZURE_AD',
}

export interface AuthConfig {
	oboTokenProvider: OboTokenProvider;
	discoveryUrl: string;
	clientId: string;
	privateJwk: string;
	tokenX?: TokenXConfig;
}

interface LoginProviderConfig {
	discoveryUrl: string;
	clientId: string;
	privateJwk: string;
}

export interface TokenXConfig {
	discoveryUrl: string;
	clientId: string;
	privateJwk: string;
}

export const logAuthConfig = (config: AuthConfig | undefined): void => {
	if (!config) return;

	const { oboTokenProvider, discoveryUrl, clientId } = config;
	logger.info(`Auth config: authProvider=${oboTokenProvider} discoveryUrl=${discoveryUrl} clientId=${clientId}`);
};

export const resolveAuthConfig = (jsonConfig: JsonData | undefined): AuthConfig => {
	let authConfig = resolveAuthConfigFromJson(jsonConfig);

	if (authConfig.oboTokenProvider === OboTokenProvider.AZURE_AD) {
		const loginProviderConfig = resolveAzureAdLoginProviderConfig();

		authConfig = merge({ loginProvider: OboTokenProvider.AZURE_AD }, authConfig, loginProviderConfig);
	} else if (authConfig.oboTokenProvider === OboTokenProvider.TOKEN_X) {
		const loginProviderConfig = resolveIdPortenLoginProviderConfig();
		const tokenXConfig = resolveTokenXConfig();

		authConfig = merge({ loginProvider: OboTokenProvider.TOKEN_X, tokenX: tokenXConfig }, authConfig, loginProviderConfig)
	}

	return validateAuthConfig(authConfig);
};

const resolveAuthConfigFromJson = (jsonConfig: JsonData | undefined): Partial<AuthConfig> => {
	if (!jsonConfig?.auth) return {};

	return {
		oboTokenProvider: strToEnum(jsonConfig.loginProvider, OboTokenProvider),
	};
};

const resolveAzureAdLoginProviderConfig = (): LoginProviderConfig => {
	const clientId = assert(process.env.AZURE_APP_CLIENT_ID, 'AZURE_APP_CLIENT_ID is missing');
	const discoveryUrl = assert(process.env.AZURE_APP_WELL_KNOWN_URL, 'AZURE_APP_WELL_KNOWN_URL is missing');
	const jwk = assert(process.env.AZURE_APP_JWK, 'AZURE_APP_JWK is missing');

	return { clientId, discoveryUrl, privateJwk: jwk };
};

const resolveIdPortenLoginProviderConfig = (): LoginProviderConfig => {
	const clientId = assert(process.env.IDPORTEN_CLIENT_ID, 'IDPORTEN_CLIENT_ID is missing');
	const discoveryUrl = assert(process.env.IDPORTEN_WELL_KNOWN_URL, 'IDPORTEN_WELL_KNOWN_URL is missing');
	const jwk = assert(process.env.IDPORTEN_CLIENT_JWK, 'IDPORTEN_CLIENT_JWK is missing');

	return { clientId, discoveryUrl, privateJwk: jwk };
};

const resolveTokenXConfig = (): TokenXConfig => {
	const clientId = assert(process.env.TOKEN_X_CLIENT_ID, 'TOKEN_X_CLIENT_ID is missing');
	const discoveryUrl = assert(process.env.TOKEN_X_WELL_KNOWN_URL, 'TOKEN_X_WELL_KNOWN_URL is missing');
	const privateJwk = assert(process.env.TOKEN_X_PRIVATE_JWK, 'TOKEN_X_PRIVATE_JWK is missing');

	return { clientId, discoveryUrl, privateJwk };
};

const validateAuthConfig = (config: Partial<AuthConfig>): AuthConfig => {
	assert(config.oboTokenProvider, `Auth 'loginProvider' is missing`);

	assert(config.discoveryUrl, `Auth 'discoveryUrl' is missing`);
	assert(config.clientId, `Auth 'clientId' is missing`);
	assert(config.privateJwk, `Auth 'privateJwk' is missing`);

	if (config.oboTokenProvider === OboTokenProvider.TOKEN_X) {
		assert(config.tokenX, `Auth 'tokenX' is missing`);
	}

	return config as AuthConfig;
};