import { FallbackStrategy } from './app-config';

export interface EnvironmentConfig {
	port?: number;
	serveFromPath?: string;
	contextPath?: string;
	jsonConfigFilePath?: string;
	jsonConfig?: string;
	gcsBucketName?: string;
	gcsBucketContextPath?: string;
	corsDomain?: string;
	corsAllowCredentials?: boolean;
	fallbackStrategy?: FallbackStrategy;
	enableFrontendEnv?: boolean;
	enforceLogin?: boolean;
	loginRedirectUrl?: string;
	oidcDiscoveryUrl?: string;
	oidcClientId?: string;
	tokenCookieName?: string;
}

export function getEnvironmentConfig(): EnvironmentConfig {
	const environment = new Environment();

	return {
		port: environment.port,
		serveFromPath: environment.serveFromPath,
		contextPath: environment.contextPath,
		jsonConfigFilePath: environment.jsonConfigFilePath,
		jsonConfig: environment.jsonConfig,
		gcsBucketName: environment.gcsBucketName,
		gcsBucketContextPath: environment.gcsBucketContextPath,
		corsDomain: environment.corsDomain,
		corsAllowCredentials: environment.corsAllowCredentials,
		fallbackStrategy: environment.fallbackStrategy,
		enableFrontendEnv: environment.enableFrontendEnv,
		enforceLogin: environment.enforceLogin,
		loginRedirectUrl: environment.loginRedirectUrl,
		oidcDiscoveryUrl: environment.oidcDiscoveryUrl,
		oidcClientId: environment.oidcClientId,
		tokenCookieName: environment.tokenCookieName,
	};
}

export class Environment {

	get port(): number | undefined {
		const portFromEnv = process.env.PORT;
		const port = portFromEnv ? parseInt(portFromEnv) : NaN;
		return isNaN(port) ? undefined : port;
	}

	get serveFromPath(): string | undefined {
		return process.env.SERVE_FROM_PATH;
	}

	get gcsBucketName(): string | undefined {
		return process.env.GCS_BUCKET_NAME;
	}

	get gcsBucketContextPath(): string | undefined {
		return process.env.GCS_BUCKET_CONTEXT_PATH;
	}

	get jsonConfigFilePath(): string | undefined {
		return process.env.JSON_CONFIG_FILE_PATH;
	}

	get contextPath(): string | undefined {
		return process.env.CONTEXT_PATH;
	}

	get jsonConfig(): string | undefined {
		return process.env.JSON_CONFIG;
	}

	get corsDomain(): string | undefined {
		return process.env.CORS_DOMAIN;
	}

	get corsAllowCredentials(): boolean | undefined {
		return process.env.CORS_ALLOW_CREDENTIALS === 'true';
	}

	get fallbackStrategy(): FallbackStrategy | undefined {
		const strategy = process.env.FALLBACK_STRATEGY;

		// @ts-ignore
		if (!strategy) {
			return undefined;
		} else if (!Object.values(FallbackStrategy).includes(strategy as FallbackStrategy)) {
			console.error(`Invalid fallback strategy ${strategy}! Using default instead`);
			return undefined;
		}

		return strategy as FallbackStrategy;
	}

	get enableFrontendEnv(): boolean | undefined {
		return process.env.ENABLE_FRONTEND_ENV === 'true';
	}

	get enforceLogin(): boolean | undefined {
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
