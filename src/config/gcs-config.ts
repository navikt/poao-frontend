import { assert } from '../utils/assert.js';
import { logger } from '../utils/logger.js';
import { JsonConfig } from './app-config-resolver.js';

export interface GcsConfig {
	bucketName: string;
	bucketContextPath: string;
}

export function logGcsConfig(config: GcsConfig | undefined) {
	if (!config) return;

	logger.info(`GCS config: bucketName=${config.bucketName} bucketContextPath=${config.bucketContextPath}`);
}

export const resolveGcsConfig = (gcsJsonConfig: JsonConfig.GcsConfig | undefined): GcsConfig | undefined => {
	if (!gcsJsonConfig) {
		return undefined
	}

	const config: Partial<GcsConfig> = {
		bucketName: gcsJsonConfig.bucketName,
		bucketContextPath: gcsJsonConfig.bucketContextPath,
	}

	if (config.bucketContextPath == null) {
		config.bucketContextPath = '';
	}

	return validateConfig(config)
};

const validateConfig = (config: Partial<GcsConfig>): GcsConfig => {
	assert(config.bucketName, `GCS 'bucketName' is missing`)
	return config as GcsConfig;
};