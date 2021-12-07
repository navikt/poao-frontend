import { existsSync, readFileSync } from 'fs';

import { AuthConfig, logAuthConfig, resolveAuthConfig } from './auth-config';
import { BaseConfig, logBaseConfig, resolveBaseConfig } from './base-config';
import { CorsConfig, logCorsConfig, resolveCorsConfig } from './cors-config';
import { ProxyConfig, logProxyConfig, resolveProxyConfig } from './proxy-config';
import { RedirectConfig, logRedirectConfig, resolveRedirectConfig } from './redirect-config';
import { GcsConfig, logGcsConfig, resolveGcsConfig } from './gcs-config';
import { parseJSONwithSubstitutions } from '../utils/json-utils';

export interface AppConfig {
	base: BaseConfig;
	auth?: AuthConfig;
	gcs?: GcsConfig;
	cors: CorsConfig;
	proxy: ProxyConfig;
	redirect: RedirectConfig;
}

const DEFAULT_JSON_CONFIG_FILE_PATH = '/app/config/config.js';

export function createAppConfig(): AppConfig {
	const jsonConfigStr = resolveJsonConfigStr();

	const jsonData = jsonConfigStr
		? parseJSONwithSubstitutions(jsonConfigStr)
		: undefined;

	return {
		base: resolveBaseConfig(jsonData),
		auth: resolveAuthConfig(jsonData),
		cors: resolveCorsConfig(jsonData),
		gcs: resolveGcsConfig(jsonData),
		proxy: resolveProxyConfig(jsonData),
		redirect: resolveRedirectConfig(jsonData),
	};
}

export function logAppConfig(config: AppConfig): void {
	logBaseConfig(config.base);
	logAuthConfig(config.auth);
	logCorsConfig(config.cors);
	logGcsConfig(config.gcs);
	logProxyConfig(config.proxy);
	logRedirectConfig(config.redirect);
}

function resolveJsonConfigStr(): string | undefined {
	const jsonConfigEnv = process.env.JSON_CONFIG;

	if (jsonConfigEnv) {
		return jsonConfigEnv
	}

	const jsonConfigFilePath = process.env.JSON_CONFIG_FILE_PATH || DEFAULT_JSON_CONFIG_FILE_PATH;

	return readConfigFile(jsonConfigFilePath)
}

function readConfigFile(configFilePath: string): string | undefined {
	if (!existsSync(configFilePath)) return undefined;
	return readFileSync(configFilePath).toString();
}
