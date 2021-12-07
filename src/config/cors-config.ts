import { assert, csvStrToStrArray } from '../utils';
import { logger } from '../utils/logger';
import { JsonData } from '../utils/json-utils';

export const DEFAULT_CORS_MAX_AGE = 7200; // 2 hours. Chrome caps out at this value
export const DEFAULT_CORS_CREDENTIALS = true;
export const DEFAULT_CORS_ALLOWED_HEADERS = ['Nav-Consumer-Id'];

export interface CorsConfig {
	origin?: string;
	credentials: boolean;
	maxAge: number;
	allowedHeaders: string[];
}

export const logCorsConfig = (config: CorsConfig): void => {
	const { origin, credentials, allowedHeaders, maxAge } = config;
	logger.info(
		`Cors config: origin=${origin} credentials=${credentials} maxAge=${maxAge} allowedHeaders=${allowedHeaders}`
	);
};

export const resolveCorsConfig = (jsonData: JsonData | undefined): CorsConfig => {
	const config: Partial<CorsConfig> = {
		origin: jsonData?.origin,
		credentials: jsonData?.credentials,
		maxAge: jsonData?.maxAge,
		allowedHeaders: csvStrToStrArray(jsonData?.origin),
	}

	if (config.maxAge == null) {
		config.maxAge = DEFAULT_CORS_MAX_AGE;
	}

	if (config.credentials == null) {
		config.credentials = DEFAULT_CORS_CREDENTIALS;
	}

	if (config.allowedHeaders == null) {
		config.allowedHeaders = DEFAULT_CORS_ALLOWED_HEADERS;
	}

	return validateConfig(config);
};

const validateConfig = (config: Partial<CorsConfig>): CorsConfig => {
	assert(config.credentials, `CORS 'credentials' is missing`)
	assert(config.maxAge, `CORS 'maxAge' is missing`)
	assert(config.allowedHeaders, `CORS 'allowedHeaders' is missing`)
	return config as CorsConfig;
};
