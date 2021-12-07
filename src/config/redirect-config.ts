import { JsonData } from '../utils/json-utils';
import { logger } from '../utils/logger';

export interface RedirectConfig {
	redirects: Redirect[];
}

export interface Redirect {
	from: string; // Must be a relative path
	to: string;
	preserveContextPath?: boolean;
}

export const logRedirectConfig = (config: RedirectConfig): void => {
	config.redirects.forEach(redirect => {
		logger.info(
			`Redirect config: from=${redirect.from} to=${redirect.to} preserveContextPath=${redirect.preserveContextPath}`
		);
	});
};

export const resolveRedirectConfig = (jsonData: JsonData | undefined): RedirectConfig => {
	if (!jsonData) {
		return { redirects: [] };
	}

	const partialRedirects = jsonData.redirects as Partial<Redirect>[];

	const redirects = partialRedirects.map(validateRedirect);

	return { redirects };
};

function validateRedirect(redirect: Partial<Redirect>): Redirect {
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

	return redirect as Redirect
}