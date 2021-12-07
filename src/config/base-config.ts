import { logger } from '../utils/logger';
import { JsonData } from '../utils/json-utils';

const DEFAULT_PORT = 8080;

const DEFAULT_SERVE_FROM_PATH = '/app/public';

const DEFAULT_CONTEXT_PATH = '';

export enum FallbackStrategy {
	REDIRECT = 'redirect',
	SERVE = 'serve',
	NONE = 'none'
}

export interface BaseConfig {
	port: number;
	fallbackStrategy: FallbackStrategy;
	enableFrontendEnv: boolean;
	contextPath: string;
	serveFromPath: string;
}

export function logBaseConfig(config: BaseConfig) {
	logger.info(
		`Config: port=${config.port} contextPath=${config.contextPath} serveFromPath=${config.serveFromPath} fallbackStrategy=${config.fallbackStrategy} enableFrontendEnv=${config.enableFrontendEnv}`
	);
}

export function resolveBaseConfig(jsonConfig: JsonData | undefined): BaseConfig {
	const config: Partial<BaseConfig> = {
		port: jsonConfig?.port,
		fallbackStrategy: jsonConfig?.fallbackStrategy,
		enableFrontendEnv: jsonConfig?.enableFrontendEnv,
		contextPath: jsonConfig?.contextPath,
		serveFromPath: jsonConfig?.serveFromPath
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

	return validateConfig(config)
}

function validateConfig(partialConfig: Partial<BaseConfig>): BaseConfig {
	// TODO: Validate
	return partialConfig as BaseConfig
}