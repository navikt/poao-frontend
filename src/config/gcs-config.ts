import { JsonData } from '../utils/json-utils';
import { assert } from '../utils';
import { logger } from '../utils/logger';

export interface GcsConfig {
	bucketName: string;
	bucketContextPath: string;
}

export function logGcsConfig(config: GcsConfig | undefined) {
	if (!config) return;

	logger.info(`GCS config: bucketName=${config.bucketName} bucketContextPath=${config.bucketContextPath}`);
}

export const resolveGcsConfig = (gcsJsonData: JsonData | undefined): GcsConfig | undefined => {
	if (!gcsJsonData) {
		return undefined
	}

	const config: Partial<GcsConfig> = {
		bucketName: gcsJsonData.bucketName,
		bucketContextPath: gcsJsonData.bucketContextPath,
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