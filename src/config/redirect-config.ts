import { JsonData } from '../utils/json-utils';
import { logger } from '../utils/logger';

export interface RedirectConfig {
	redirects: Redirect[];
}

export interface Redirect {
	fromPath: string; // Must be a relative path
	toUrl: string;
	preserveFromPath: boolean; // If true, 'fromPath' will be prepended to the request path before sending to 'toUrl'
}

const DEFAULT_PRESERVE_FROM_PATH = false;

export const logRedirectConfig = (config: RedirectConfig): void => {
	config.redirects.forEach(redirect => {
		logger.info(
			`Redirect config: from=${redirect.fromPath} to=${redirect.toUrl} preserveFromPath=${redirect.preserveFromPath}`
		);
	});
};

export const resolveRedirectConfig = (jsonData: JsonData | undefined): RedirectConfig => {
	if (!jsonData) {
		return { redirects: [] };
	}

	const partialRedirects = jsonData as Partial<Redirect>[];

	const redirects = partialRedirects.map(r => validateRedirect(addDefaultValues(r)));

	return { redirects };
};

const addDefaultValues = (partialRedirect: Partial<Redirect>): Partial<Redirect> => {
	if (partialRedirect.preserveFromPath == null) {
		partialRedirect.preserveFromPath = DEFAULT_PRESERVE_FROM_PATH;
	}

	return partialRedirect
}

function validateRedirect(redirect: Partial<Redirect>): Redirect {
	if (!redirect.fromPath) {
		throw new Error(`The field 'from' is missing from: ${JSON.stringify(redirect)}`);
	}

	if (!redirect.toUrl) {
		throw new Error(`The field 'to' is missing from: ${JSON.stringify(redirect)}`);
	}

	if (!redirect.fromPath.startsWith("/")) {
		throw new Error(`'${redirect.fromPath}' is not a relative path starting with '/'`);
	}

	if (redirect.fromPath.startsWith("/internal")) {
		throw new Error(`'${redirect.fromPath}' cannot start with '/internal'`);
	}

	return redirect as Redirect
}