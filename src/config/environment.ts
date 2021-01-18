export enum FallbackStrategy {
	REDIRECT = 'redirect',
	SERVE = 'serve',
	NONE = 'none'
}

const DEFAULT_PORT = 8080;
const DEFAULT_SERVE_FROM_PATH = '/app/public';
const DEFAULT_JSON_CONFIG_FILE_PATH = '/app/config/config.js';
const DEFAULT_CONTEXT_PATH = '';
const DEFAULT_FALLBACK_STRATEGY = FallbackStrategy.REDIRECT;

export class Environment {

	get port(): number {
		const portFromEnv = process.env.PORT;
		const port = portFromEnv ? parseInt(portFromEnv) : NaN;
		return isNaN(port) ? DEFAULT_PORT : port;
	}

	get serveFromPath(): string {
		return process.env.SERVE_FROM_PATH || DEFAULT_SERVE_FROM_PATH;
	}

	get gcsBucketName(): string | undefined {
		return process.env.GCS_BUCKET_NAME;
	}

	get gcsBucketContextPath(): string | undefined {
		return process.env.GCS_BUCKET_CONTEXT_PATH;
	}

	get jsonConfigFilePath(): string {
		return process.env.JSON_CONFIG_FILE_PATH || DEFAULT_JSON_CONFIG_FILE_PATH;
	}

	get contextPath(): string {
		return process.env.CONTEXT_PATH || DEFAULT_CONTEXT_PATH;
	}

	get jsonConfig(): string | undefined {
		return process.env.JSON_CONFIG;
	}

	get corsDomain(): string | undefined {
		return process.env.CORS_DOMAIN;
	}

	get corsAllowCredentials(): boolean {
		return process.env.CORS_ALLOW_CREDENTIALS === 'true';
	}

	get fallbackStrategy(): FallbackStrategy {
		const strategy = process.env.FALLBACK_STRATEGY || DEFAULT_FALLBACK_STRATEGY;

		// @ts-ignore
		if (!Object.values(FallbackStrategy).includes(strategy)) {
			throw new Error('Invalid fallback strategy ' + strategy);
		}

		return strategy as FallbackStrategy;
	}

	get enableFrontendEnv(): boolean {
		return process.env.ENABLE_FRONTEND_ENV === 'true';
	}

	get enforceLogin(): boolean {
		return process.env.ENFORCE_LOGIN === 'true';
	}

	get loginRedirectUrl(): string | undefined {
		return process.env.LOGIN_REDIRECT_URL;
	}

	get oidcDiscoveryUrl(): string | undefined {
		return process.env.OIDC_DISCOVERY_URL;
	}

	get oidcClientId(): string | undefined {
		return process.env.OIDC_CLIENT_ID;
	}

	get tokenCookieName(): string | undefined {
		return process.env.TOKEN_COOKIE_NAME;
	}

}

const environment = new Environment();

export default environment;
