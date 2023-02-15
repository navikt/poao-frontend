import { logger } from '../utils/logger';
import { JsonConfig } from './app-config-resolver';
import { toNullableEnumValue } from '../utils';

export enum FallbackStrategy {
	REDIRECT_TO_ROOT = 'REDIRECT_TO_ROOT',
	SERVE_INDEX_HTML = 'SERVE_INDEX_HTML',
	NONE = 'NONE'
}

export interface BaseConfig {
	port: number;
	fallbackStrategy: FallbackStrategy;
	enableFrontendEnv: boolean;
	contextPath: string;
	serveFromPath: string;
	enableSecureLogs: boolean;
}

const DEFAULT_PORT = 8080;

const DEFAULT_SERVE_FROM_PATH = '/app/public';

const DEFAULT_CONTEXT_PATH = '/';

const DEFAULT_FALLBACK_STRATEGY = FallbackStrategy.SERVE_INDEX_HTML;

const DEFAULT_ENABLE_FRONTEND_ENV = false;

const DEFAULT_ENABLE_SECURE_LOGS = false;

export function logBaseConfig(config: BaseConfig) {
	logger.info(
		`Config: port=${config.port} contextPath=${config.contextPath} serveFromPath=${config.serveFromPath} fallbackStrategy=${config.fallbackStrategy} enableFrontendEnv=${config.enableFrontendEnv} enableSecureLogs=${config.enableSecureLogs}`
	);
}

export function resolveBaseConfig(jsonConfig: JsonConfig.Config | undefined): BaseConfig {
	const config: Partial<BaseConfig> = {
		port: jsonConfig?.port,
		fallbackStrategy: toNullableEnumValue(FallbackStrategy, jsonConfig?.fallbackStrategy),
		enableFrontendEnv: jsonConfig?.enableFrontendEnv,
		contextPath: jsonConfig?.contextPath,
		serveFromPath: jsonConfig?.serveFromPath,
		enableSecureLogs: jsonConfig?.enableSecureLogs,
	}

	if (config.port == null) {
		config.port = DEFAULT_PORT;
	}

	if (config.serveFromPath == null) {
		config.serveFromPath = DEFAULT_SERVE_FROM_PATH;
	}

	if (config.contextPath == null) {
		config.contextPath = DEFAULT_CONTEXT_PATH;
	}

	if (config.fallbackStrategy == null) {
		config.fallbackStrategy = DEFAULT_FALLBACK_STRATEGY;
	}

	if (config.enableFrontendEnv == null) {
		config.enableFrontendEnv = DEFAULT_ENABLE_FRONTEND_ENV;
	}

	if (config.enableSecureLogs == null) {
		config.enableSecureLogs = DEFAULT_ENABLE_SECURE_LOGS;
	}

	return validateConfig(config)
}

function validateConfig(partialConfig: Partial<BaseConfig>): BaseConfig {
	// TODO: Validate
	return partialConfig as BaseConfig
}