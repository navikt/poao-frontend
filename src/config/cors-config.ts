import { assert } from "../utils/assert.js";
import { logger } from "../utils/logger.js";
import { JsonConfig } from "./app-config-resolver.js";

export const DEFAULT_CORS_MAX_AGE = 7200; // 2 hours. Chrome caps out at this value
export const DEFAULT_CORS_CREDENTIALS = true;
export const DEFAULT_CORS_ALLOWED_HEADERS = undefined; // Allow all headers

export interface CorsConfig {
  origin: string | string[] | undefined;
  credentials: boolean;
  maxAge: number;
  allowedHeaders: string[] | undefined;
}

export const logCorsConfig = (config: CorsConfig): void => {
  const { origin, credentials, allowedHeaders, maxAge } = config;
  logger.info(
    `Cors config: origin=${origin} credentials=${credentials} maxAge=${maxAge} allowedHeaders=${allowedHeaders}`
  );
};

export const resolveCorsConfig = (
  corsJsonConfig: JsonConfig.CorsConfig | undefined
): CorsConfig => {
  const config: Partial<CorsConfig> = {
    origin: corsJsonConfig?.origin,
    credentials: corsJsonConfig?.credentials,
    maxAge: corsJsonConfig?.maxAge,
    allowedHeaders: corsJsonConfig?.allowedHeaders,
  };

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
  assert(config.credentials, `CORS 'credentials' is missing`);
  assert(config.maxAge, `CORS 'maxAge' is missing`);
  return config as CorsConfig;
};
