import { JsonData } from '../utils/json-utils';

export interface RedirectConfig {
	redirects: Redirect[];
}

export interface Redirect {
	from: string; // Must be a relative path
	to: string;
	preserveContextPath?: boolean;
}

export const resolveRedirectConfig = (jsonData: JsonData | undefined): RedirectConfig => {
	if (!jsonData) {
		return { redirects: [] };
	}

	return {
		redirects: []
	}
};

export const logRedirectConfig = (config: RedirectConfig): void => {
	// logger.info(
	// 	`Redirect config: from=${config.from} to=${config.to} preserveContextPath=${config.preserveContextPath}`
	// );
};

// export function validateConfig(config: JsonData | undefined) {
// 	if (!config) return;
//
// 	if (config.redirects) {
// 		config.redirects.forEach(redirect => {
// 			if (!redirect.from) {
// 				throw new Error(`The field 'from' is missing from: ${JSON.stringify(redirect)}`);
// 			}
//
// 			if (!redirect.to) {
// 				throw new Error(`The field 'to' is missing from: ${JSON.stringify(redirect)}`);
// 			}
//
// 			if (!redirect.from.startsWith("/")) {
// 				throw new Error(`'${redirect.from}' is not a relative path starting with '/'`);
// 			}
//
// 			if (redirect.from.startsWith("/internal")) {
// 				throw new Error(`'${redirect.from}' cannot start with '/internal'`);
// 			}
// 		});
// 	}
// }