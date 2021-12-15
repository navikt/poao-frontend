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
		? parseJSONwithSubstitutions(jsonConfigStr) as JsonConfig.Config
		: undefined;

	return {
		base: resolveBaseConfig(jsonData),
		auth: resolveAuthConfig(jsonData?.auth),
		cors: resolveCorsConfig(jsonData?.cors),
		gcs: resolveGcsConfig(jsonData?.gcs),
		proxy: resolveProxyConfig(jsonData?.proxies),
		redirect: resolveRedirectConfig(jsonData?.redirects),
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

export namespace JsonConfig {
	export interface Config {
		port?: number;
		fallbackStrategy?: string;
		enableFrontendEnv?: boolean;
		contextPath?: string;
		serveFromPath?: string;
		auth?: AuthConfig;
		cors?: CorsConfig;
		gcs?: GcsConfig;
		redirects?: Redirect[];
		proxies?: Proxy[];
	}

	export interface AuthConfig {
		loginProvider?: string;
	}

	export interface CorsConfig {
		origin?: string;
		credentials?: boolean;
		maxAge?: number;
		allowedHeaders?: string[];
	}

	export interface GcsConfig {
		bucketName?: string;
		bucketContextPath?: string;
	}

	export interface Proxy {
		fromPath?: string;
		toUrl?: string;
		preserveFromPath?: boolean;
		toApp?: {
			name?: string;
			namespace?: string;
			cluster?: string;
		}
	}

	export interface Redirect {
		fromPath?: string;
		toUrl?: string;
		preserveFromPath?: boolean;
	}
}

