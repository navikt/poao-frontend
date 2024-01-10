import { logger } from '../utils/logger.js';
import { JsonConfig } from './app-config-resolver.js';

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

export const resolveRedirectConfig = (redirectsJsonConfig: JsonConfig.Redirect[] | undefined): RedirectConfig => {
	if (!redirectsJsonConfig) {
		return { redirects: [] };
	}

	const redirects = redirectsJsonConfig.map(r => validateRedirect(toPartialRedirect(r)));

	return { redirects };
};

const toPartialRedirect = (redirect: JsonConfig.Redirect): Partial<Redirect> => {
	const partialRedirect: Partial<Redirect> = {
		fromPath: redirect.fromPath,
		toUrl: redirect.toUrl,
		preserveFromPath: redirect.preserveFromPath
	}

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