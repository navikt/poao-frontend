import { JsonData } from '../utils/json-utils';

export interface GcsConfig {
	bucketName: string;
	bucketContextPath: string;
}

export const resolveGcsConfig = (jsonData: JsonData | undefined): GcsConfig => {
	return {
		bucketName: '',
		bucketContextPath: '',
	}
};

export function logGcsConfig(config: GcsConfig | undefined) {
	if (!config) return;


}