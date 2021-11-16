import { existsSync, readFileSync } from 'fs';
import {FallbackStrategy} from './app-config';
import {parseJSONwithSubstitutions} from "../utils/json-utils";

export interface JsonConfig {
	port?: number;
	serveFromPath?: string;
	contextPath?: string;
	gcsBucketName?: string;
	gcsBucketContextPath?: string;
	corsDomain?: string;
	corsAllowCredentials?: boolean;
	fallbackStrategy?: FallbackStrategy;
	enableFrontendEnv?: boolean;
	enforceLogin?: boolean;
	loginRedirectUrl?: string;
	oidcDiscoveryUrl?: string;
	oidcClientId?: string;
	tokenCookieName?: string;
	proxies?: ProxyConfig[];
	redirects?: RedirectConfig[];
}

export interface ProxyConfig {
	from: string; // Must be a relative path
	to: string;
	preserveContextPath?: boolean;
}

export interface RedirectConfig {
	from: string; // Must be a relative path
	to: string;
}

export function readConfigFile(configFilePath: string): JsonConfig | undefined {
	if (!existsSync(configFilePath)) return undefined;

	const configStr = readFileSync(configFilePath).toString();

	return parseJSONwithSubstitutions(configStr);
}

export function validateConfig(config: JsonConfig | undefined) {
	if (!config) return;

	if (config.proxies) {
		config.proxies.forEach(proxy => {
			if (!proxy.from) {
				throw new Error(`The field 'from' is missing from: ${JSON.stringify(proxy)}`);
			}

			if (!proxy.to) {
				throw new Error(`The field 'to' is missing from: ${JSON.stringify(proxy)}`);
			}

			if (!proxy.from.startsWith("/")) {
				throw new Error(`'${proxy.from}' is not a relative path starting with '/'`);
			}

			if (proxy.from.startsWith("/internal")) {
				throw new Error(`'${proxy.from}' cannot start with '/internal'`);
			}
		});
	}

	if (config.redirects) {
		config.redirects.forEach(redirect => {
			if (!redirect.from) {
				throw new Error(`The field 'from' is missing from: ${JSON.stringify(redirect)}`);
			}

			if (!redirect.to) {
				throw new Error(`The field 'to' is missing from: ${JSON.stringify(redirect)}`);
			}

			if (!redirect.from.startsWith("/")) {
				throw new Error(`'${redirect.from}' is not a relative path starting with '/'`);
			}

			if (redirect.from.startsWith("/internal")) {
				throw new Error(`'${redirect.from}' cannot start with '/internal'`);
			}
		});
	}
}