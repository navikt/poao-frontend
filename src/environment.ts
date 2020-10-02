export enum FallbackStrategy {
	REDIRECT = 'redirect',
	SERVE = 'serve',
	NONE = 'none'
}

const DEFAULT_PORT = 8080;
const DEFAULT_SERVE_FROM_PATH = '/app/public';
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

	get contextPath(): string {
		return process.env.CONTEXT_PATH || DEFAULT_CONTEXT_PATH;
	}

	get fallbackStrategy(): FallbackStrategy {
		const strategy = process.env.FALLBACK_STRATEGY || DEFAULT_FALLBACK_STRATEGY;

		// @ts-ignore
		if (!Object.values(FallbackStrategy).includes(strategy)) {
			throw new Error('Invalid fallback strategy ' + strategy);
		}

		return strategy as FallbackStrategy;
	}

	get navDekoratorUrl(): string | undefined {
		return process.env.NAV_DEKORATOR_URL;
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
