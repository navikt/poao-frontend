import { getEnvironmentConfig } from './environment-config';
import { ProxyConfig, readConfigFile, validateConfig } from './json-config';
import { logger } from '../logger';
import { isAbsolute, join } from 'path';

export enum FallbackStrategy {
	REDIRECT = 'redirect',
	SERVE = 'serve',
	NONE = 'none'
}

const DEFAULT_PORT = 8080;
const DEFAULT_SERVE_FROM_PATH = '/app/public';
const DEFAULT_JSON_CONFIG_FILE_PATH = '/app/config/config.js';
const DEFAULT_CONTEXT_PATH = '';
const DEFAULT_FALLBACK_STRATEGY = FallbackStrategy.REDIRECT;

export interface AppConfig {
	port: number;
	serveFromPath: string;
	contextPath: string;
	gcsBucketName?: string;
	gcsBucketContextPath?: string;
	corsDomain?: string;
	corsAllowCredentials: boolean;
	fallbackStrategy: FallbackStrategy;
	enableFrontendEnv: boolean;
	enforceLogin: boolean;
	loginRedirectUrl?: string;
	oidcDiscoveryUrl?: string;
	oidcClientId?: string;
	tokenCookieName?: string;
	proxies?: ProxyConfig[];
}

export function createAppConfig(): AppConfig {
	const environmentConfig = getEnvironmentConfig();

	const jsonConfig = environmentConfig.jsonConfig
		? JSON.parse(environmentConfig.jsonConfig)
		: readConfigFile(environmentConfig.jsonConfigFilePath || DEFAULT_JSON_CONFIG_FILE_PATH);

	validateConfig(jsonConfig);

	const rawServeFromPath = jsonConfig?.serveFromPath || environmentConfig.serveFromPath || DEFAULT_SERVE_FROM_PATH;
	const rawContextPath = jsonConfig?.contextPath || environmentConfig.contextPath || DEFAULT_CONTEXT_PATH;

	const serveFromPath = isAbsolute(rawServeFromPath) ? rawServeFromPath : join(__dirname, rawServeFromPath);
	const contextPath = rawContextPath === '' ? '/' : rawContextPath;

	return {
		port: jsonConfig?.port || environmentConfig.port || DEFAULT_PORT,
		serveFromPath: serveFromPath,
		contextPath: contextPath,
		gcsBucketName: jsonConfig?.gcsBucketName || environmentConfig.gcsBucketName,
		gcsBucketContextPath: jsonConfig?.gcsBucketContextPath || environmentConfig.gcsBucketContextPath,
		corsDomain: jsonConfig?.corsDomain || environmentConfig.corsDomain,
		corsAllowCredentials: jsonConfig?.corsAllowCredentials != undefined
			? jsonConfig.corsAllowCredentials
			: !!environmentConfig.corsAllowCredentials,
		fallbackStrategy: jsonConfig?.fallbackStrategy || environmentConfig.fallbackStrategy || DEFAULT_FALLBACK_STRATEGY,
		enableFrontendEnv: jsonConfig?.enableFrontendEnv != undefined
			? jsonConfig.enableFrontendEnv
			: !!environmentConfig.enableFrontendEnv,
		enforceLogin: jsonConfig?.enforceLogin != undefined
			? jsonConfig.enforceLogin
			: !!environmentConfig.enforceLogin,
		loginRedirectUrl: jsonConfig?.loginRedirectUrl || environmentConfig.loginRedirectUrl,
		oidcDiscoveryUrl: jsonConfig?.oidcDiscoveryUrl || environmentConfig.oidcDiscoveryUrl,
		oidcClientId: jsonConfig?.oidcClientId || environmentConfig.oidcClientId,
		tokenCookieName: jsonConfig?.tokenCookieName || environmentConfig.tokenCookieName,
		proxies: jsonConfig?.proxies
	};
}

export function logAppConfig(appConfig: AppConfig): void {
	let logStr = 'App Config\n\n';
	
	logStr += `Context path: ${appConfig.contextPath}\n`;
	logStr += `Port: ${appConfig.port}\n`;

	if (appConfig.gcsBucketName) {
		logStr += `Serving files from GCS bucket. bucket=${appConfig.gcsBucketName} contextPath=${appConfig.gcsBucketContextPath || ''} fallback=${appConfig.fallbackStrategy}\n`;
	} else {
		logStr += `Serving files from local filesystem. path=${appConfig.serveFromPath} fallback=${appConfig.fallbackStrategy}\n`;
	}
	
	logStr += `Frontend environment enabled: ${appConfig.enableFrontendEnv}\n`;
	logStr += `Enforce login: ${appConfig.enforceLogin}\n`;

	logStr += `Cors domain: ${appConfig.corsDomain}\n`;
	logStr += `Cors allow credentials: ${appConfig.corsAllowCredentials}\n`;

	if (appConfig.proxies) {
		logStr += 'HTTP Proxies:\n';
		appConfig.proxies.forEach(proxy => {
			logStr += `\t from=${proxy.from} to: ${proxy.to} preserve context path: ${!!proxy.preserveContextPath}`;
		});
	}

	if (appConfig.enforceLogin) {
		logStr += `OIDC discovery url: ${appConfig.oidcDiscoveryUrl}\n`;
		logStr += `OIDC client id: ${appConfig.oidcClientId}\n`;
		logStr += `Token cookie name: ${appConfig.tokenCookieName}\n`;
		logStr += `Login redirect url: ${appConfig.loginRedirectUrl}\n`;
	}

	logger.info(logStr);
}
