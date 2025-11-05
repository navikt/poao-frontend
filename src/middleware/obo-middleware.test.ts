import { describe, expect, it, vi, beforeEach, Mock } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { oboMiddleware, setOBOTokenOnRequest } from './obo-middleware.js';
import { AuthConfig, OboProviderType } from '../config/auth-config.js';
import { Proxy } from '../config/proxy-config.js';
import { TokenValidator } from '../utils/auth/token-validator.js';
import { OboTokenStore } from '../utils/auth/tokenStore/token-store.js';
import { AUTHORIZATION_HEADER, WONDERWALL_ID_TOKEN_HEADER } from '../utils/auth/auth-token-utils.js';

// Mock the dependencies
vi.mock('../utils/auth/auth-client-utils.js', () => ({
	createAzureAdOnBehalfOfToken: vi.fn(),
	createTokenXOnBehalfOfToken: vi.fn()
}));

vi.mock('@navikt/oasis', () => ({
	expiresIn: vi.fn()
}));

vi.mock('../utils/auth/auth-config-utils.js', () => ({
	createTokenXScope: vi.fn((app) => `dev-gcp:namespace:${app}`),
	createAzureAdScope: vi.fn((app) => `api://cluster.namespace.${app}/.default`)
}));

vi.mock('../utils/auth/tokenStore/token-store.js', async (importOriginal) => {
	const actual = await importOriginal() as any;
	return {
		...actual,
		createOboTokenKey: actual.createOboTokenKey
	};
});

vi.mock('../utils/logger.js', () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	}
}));

import { createAzureAdOnBehalfOfToken, createTokenXOnBehalfOfToken } from '../utils/auth/auth-client-utils.js';
import { expiresIn } from '@navikt/oasis';

// Test utilities
interface TestConfig {
	authConfig?: Partial<AuthConfig>;
	proxy?: Partial<Proxy>;
	request?: {
		accessToken?: string;
		headers?: Record<string, string>;
	};
	tokenValidator?: {
		isValid?: boolean;
	};
	tokenStore?: {
		cachedToken?: string;
	};
	oboExchange?: {
		newToken?: string;
		expiresIn?: number;
	};
}

class TestContext {
	mockAccessToken = 'mock-access-token';
	mockOboToken = 'mock-obo-token';
	mockScope = 'api://cluster.namespace.my-app/.default';

	tokenValidator: TokenValidator;
	oboTokenStore: OboTokenStore;
	authConfig: AuthConfig;
	proxy: Proxy;
	request: Partial<Request>;
	response: Partial<Response>;
	next: NextFunction;

	constructor() {
		this.tokenValidator = {
			isValid: vi.fn()
		};

		this.oboTokenStore = {
			getUserOboToken: vi.fn(),
			setUserOboToken: vi.fn(),
			deleteUserOboToken: vi.fn(),
			close: vi.fn(),
			cacheType: 'in-memory'
		};

		this.authConfig = {
			oboProviderType: OboProviderType.AZURE_AD
		} as AuthConfig;

		this.proxy = {
			toApp: { name: 'my-app', cluster: 'dev-gcp', namespace: 'obo' },
            fromPath: "/from-path",
            preserveFromPath: true,
            toUrl: '/to-app'
		};

		this.request = {
			headers: {},
			header: vi.fn((name: string) => {
				if (name === AUTHORIZATION_HEADER) {
					return this.request.headers![AUTHORIZATION_HEADER];
				}
				return undefined;
			})
		};

		this.response = {
			sendStatus: vi.fn()
		};

		this.next = vi.fn();
	}

	givenAzureAdConfig(): this {
		this.authConfig.oboProviderType = OboProviderType.AZURE_AD;
		return this;
	}

	givenTokenXConfig(): this {
		this.authConfig.oboProviderType = OboProviderType.TOKEN_X;
		return this;
	}

	givenProxyWithApp(appName: string): this {
		this.proxy.toApp = appName;
		return this;
	}

	givenProxyWithoutApp(): this {
		this.proxy.toApp = undefined;
		return this;
	}

	givenRequestWithValidToken(token?: string): this {
		this.request.headers![AUTHORIZATION_HEADER] = `Bearer ${token || this.mockAccessToken}`;
		(this.tokenValidator.isValid as Mock).mockResolvedValue(true);
		return this;
	}

	givenRequestWithInvalidToken(token?: string): this {
		this.request.headers![AUTHORIZATION_HEADER] = `Bearer ${token || this.mockAccessToken}`;
		(this.tokenValidator.isValid as Mock).mockResolvedValue(false);
		return this;
	}

	givenRequestWithMalformedAuthHeader(value: string): this {
		this.request.headers![AUTHORIZATION_HEADER] = value;
		return this;
	}

	givenRequestWithoutToken(): this {
		// Don't set authorization header
		return this;
	}

	givenCachedOboToken(token: string): this {
		(this.oboTokenStore.getUserOboToken as Mock).mockResolvedValue(token);
		return this;
	}

	givenNoCachedOboToken(): this {
		(this.oboTokenStore.getUserOboToken as Mock).mockResolvedValue(undefined);
		return this;
	}

	givenOboTokenExchange(newToken: string, expiresInSeconds: number): this {
		(expiresIn as Mock).mockReturnValue(expiresInSeconds);

		if (this.authConfig.oboProviderType === OboProviderType.TOKEN_X) {
			(createTokenXOnBehalfOfToken as Mock).mockResolvedValue(newToken);
		} else {
			(createAzureAdOnBehalfOfToken as Mock).mockResolvedValue(newToken);
		}
		return this;
	}

	async whenCallingSetOBOTokenOnRequest(scope: string | null) {
		return await setOBOTokenOnRequest(
			this.request as Request,
			this.tokenValidator,
			this.oboTokenStore,
			this.authConfig,
			scope
		);
	}

	async whenCallingMiddleware() {
		const middleware = oboMiddleware({
			authConfig: this.authConfig,
			oboTokenStore: this.oboTokenStore,
			tokenValidator: this.tokenValidator,
			proxy: this.proxy
		});

		await middleware(this.request as Request, this.response as Response, this.next);
	}

	thenShouldReturn401() {
		return { status: 401 };
	}

	thenShouldReturnUndefined() {
		return undefined;
	}

	expectTokenValidatorCalledWith(token: string) {
		expect(this.tokenValidator.isValid).toHaveBeenCalledWith(token);
	}

	expectTokenValidatorNotCalled() {
		expect(this.tokenValidator.isValid).not.toHaveBeenCalled();
	}

	expectAuthHeadersCleared() {
		expect(this.request.headers![AUTHORIZATION_HEADER]).toBe('');
		expect(this.request.headers![WONDERWALL_ID_TOKEN_HEADER]).toBe('');
	}

	expectAuthHeaderSetTo(token: string) {
		expect(this.request.headers![AUTHORIZATION_HEADER]).toBe(`Bearer ${token}`);
		expect(this.request.headers![WONDERWALL_ID_TOKEN_HEADER]).toBe('');
	}

	expectAzureAdTokenExchangeCalledWith(scope: string, accessToken: string) {
		expect(createAzureAdOnBehalfOfToken).toHaveBeenCalledWith(scope, accessToken);
		expect(createAzureAdOnBehalfOfToken).toHaveBeenCalledTimes(1);
		expect(createTokenXOnBehalfOfToken).not.toHaveBeenCalled();
	}

	expectTokenXTokenExchangeCalledWith(scope: string, accessToken: string) {
		expect(createTokenXOnBehalfOfToken).toHaveBeenCalledWith(scope, accessToken);
		expect(createTokenXOnBehalfOfToken).toHaveBeenCalledTimes(1);
		expect(createAzureAdOnBehalfOfToken).not.toHaveBeenCalled();
	}

	expectNoTokenExchangeCalled() {
		expect(createAzureAdOnBehalfOfToken).not.toHaveBeenCalled();
		expect(createTokenXOnBehalfOfToken).not.toHaveBeenCalled();
	}

	expectTokenStoredWith(expiresInSeconds: number, token: string) {
		expect(this.oboTokenStore.setUserOboToken).toHaveBeenCalledWith(
			expect.any(String),
			expiresInSeconds,
			token
		);
	}

	expectNextCalled() {
		expect(this.next).toHaveBeenCalledTimes(1);
	}

	expectNextNotCalled() {
		expect(this.next).not.toHaveBeenCalled();
	}

	expectResponseStatus(status: number) {
		expect(this.response.sendStatus).toHaveBeenCalledWith(status);
	}

	expectNoResponseStatus() {
		expect(this.response.sendStatus).not.toHaveBeenCalled();
	}
}

describe('obo-middleware', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('setOBOTokenOnRequest', () => {
		describe('token validation', () => {
			it('should return 401 when access token is missing', async () => {
				// given
				const ctx = new TestContext()
					.givenRequestWithoutToken();

				// when
				const result = await ctx.whenCallingSetOBOTokenOnRequest('some-scope');

				// then
				expect(result).toEqual(ctx.thenShouldReturn401());
				ctx.expectTokenValidatorNotCalled();
			});

			it('should return 401 when Authorization header has invalid format', async () => {
				// given
				const ctx = new TestContext()
					.givenRequestWithMalformedAuthHeader('invalid-token-without-bearer');

				// when
				const result = await ctx.whenCallingSetOBOTokenOnRequest('some-scope');

				// then
				expect(result).toEqual(ctx.thenShouldReturn401());
				ctx.expectTokenValidatorNotCalled();
			});

			it('should extract token correctly from Bearer format and validate it', async () => {
				// given
				const ctx = new TestContext()
					.givenRequestWithValidToken()
					.givenCachedOboToken('cached-token');

				// when
				const result = await ctx.whenCallingSetOBOTokenOnRequest('some-scope');

				// then
				expect(result).toEqual(ctx.thenShouldReturnUndefined());
				ctx.expectTokenValidatorCalledWith(ctx.mockAccessToken);
			});

			it('should return 401 when access token is invalid', async () => {
				// given
				const ctx = new TestContext()
					.givenRequestWithInvalidToken();

				// when
				const result = await ctx.whenCallingSetOBOTokenOnRequest('some-scope');

				// then
				expect(result).toEqual(ctx.thenShouldReturn401());
				ctx.expectTokenValidatorCalledWith(ctx.mockAccessToken);
			});
		});

		describe('scope handling', () => {
			it('should clear auth headers when scope is null', async () => {
				// given
				const ctx = new TestContext()
					.givenRequestWithValidToken();

				// when
				const result = await ctx.whenCallingSetOBOTokenOnRequest(null);

				// then
				expect(result).toEqual(ctx.thenShouldReturnUndefined());
				ctx.expectAuthHeadersCleared();
				ctx.expectNoTokenExchangeCalled();
			});
		});

		describe('token caching', () => {
			it('should use cached OBO token when available', async () => {
				// given
				const cachedToken = 'cached-obo-token';
				const ctx = new TestContext()
					.givenRequestWithValidToken()
					.givenCachedOboToken(cachedToken);

				// when
				const result = await ctx.whenCallingSetOBOTokenOnRequest('some-scope');

				// then
				expect(result).toEqual(ctx.thenShouldReturnUndefined());
				ctx.expectAuthHeaderSetTo(cachedToken);
				ctx.expectNoTokenExchangeCalled();
			});
		});

		describe('Azure AD token exchange', () => {
			it('should create new Azure AD OBO token when not cached', async () => {
				// given
				const newToken = 'new-azure-obo-token';
				const expiresInSeconds = 3600;
				const scope = 'api://cluster.namespace.my-app/.default';
				const ctx = new TestContext()
					.givenAzureAdConfig()
					.givenRequestWithValidToken()
					.givenNoCachedOboToken()
					.givenOboTokenExchange(newToken, expiresInSeconds);

				// when
				const result = await ctx.whenCallingSetOBOTokenOnRequest(scope);

				// then
				expect(result).toEqual(ctx.thenShouldReturnUndefined());
				ctx.expectAzureAdTokenExchangeCalledWith(scope, ctx.mockAccessToken);
				ctx.expectTokenStoredWith(expiresInSeconds - 30, newToken);
				ctx.expectAuthHeaderSetTo(newToken);
			});

			it('should apply correct clock skew (30 seconds) to token expiration', async () => {
				// given
				const newToken = 'new-obo-token';
				const expiresInSeconds = 3600;
				const expectedExpiryWithSkew = 3570; // 3600 - 30
				const ctx = new TestContext()
					.givenAzureAdConfig()
					.givenRequestWithValidToken()
					.givenNoCachedOboToken()
					.givenOboTokenExchange(newToken, expiresInSeconds);

				// when
				await ctx.whenCallingSetOBOTokenOnRequest('some-scope');

				// then
				ctx.expectTokenStoredWith(expectedExpiryWithSkew, newToken);
			});
		});

		describe('TokenX token exchange', () => {
			it('should create new TokenX OBO token when not cached', async () => {
				// given
				const newToken = 'new-tokenx-obo-token';
				const expiresInSeconds = 3600;
				const scope = 'dev-gcp:namespace:my-app';
				const ctx = new TestContext()
					.givenTokenXConfig()
					.givenRequestWithValidToken()
					.givenNoCachedOboToken()
					.givenOboTokenExchange(newToken, expiresInSeconds);

				// when
				const result = await ctx.whenCallingSetOBOTokenOnRequest(scope);

				// then
				expect(result).toEqual(ctx.thenShouldReturnUndefined());
				ctx.expectTokenXTokenExchangeCalledWith(scope, ctx.mockAccessToken);
				ctx.expectTokenStoredWith(expiresInSeconds - 30, newToken);
				ctx.expectAuthHeaderSetTo(newToken);
			});
		});
	});

	describe('oboMiddleware', () => {
		describe('successful token exchange', () => {
			it('should call next() when token exchange succeeds', async () => {
				// given
				const ctx = new TestContext()
					.givenRequestWithValidToken()
					.givenCachedOboToken('cached-token');

				// when
				await ctx.whenCallingMiddleware();

				// then
				ctx.expectNextCalled();
				ctx.expectNoResponseStatus();
			});
		});

		describe('error handling', () => {
			it('should send 401 status when token is missing', async () => {
				// given
				const ctx = new TestContext()
					.givenRequestWithoutToken();

				// when
				await ctx.whenCallingMiddleware();

				// then
				ctx.expectResponseStatus(401);
				ctx.expectNextNotCalled();
			});

			it('should send 401 status when token is invalid', async () => {
				// given
				const ctx = new TestContext()
					.givenRequestWithInvalidToken();

				// when
				await ctx.whenCallingMiddleware();

				// then
				ctx.expectResponseStatus(401);
				ctx.expectNextNotCalled();
			});
		});

		describe('Azure AD integration', () => {
			it('should create Azure AD scope and exchange token', async () => {
				// given
				const newToken = 'new-azure-token';
				const ctx = new TestContext()
					.givenAzureAdConfig()
					.givenProxyWithApp('my-app')
					.givenRequestWithValidToken()
					.givenNoCachedOboToken()
					.givenOboTokenExchange(newToken, 3600);

				// when
				await ctx.whenCallingMiddleware();

				// then
				ctx.expectAzureAdTokenExchangeCalledWith(
					'api://cluster.namespace.my-app/.default',
					ctx.mockAccessToken
				);
				ctx.expectNextCalled();
			});
		});

		describe('TokenX integration', () => {
			it('should create TokenX scope and exchange token', async () => {
				// given
				const newToken = 'new-tokenx-token';
				const ctx = new TestContext()
					.givenTokenXConfig()
					.givenProxyWithApp('my-app')
					.givenRequestWithValidToken()
					.givenNoCachedOboToken()
					.givenOboTokenExchange(newToken, 3600);

				// when
				await ctx.whenCallingMiddleware();

				// then
				ctx.expectTokenXTokenExchangeCalledWith(
					'dev-gcp:namespace:my-app',
					ctx.mockAccessToken
				);
				ctx.expectNextCalled();
			});
		});

		describe('proxy configuration', () => {
			it('should clear auth headers when proxy has no toApp configured', async () => {
				// given
				const ctx = new TestContext()
					.givenProxyWithoutApp()
					.givenRequestWithValidToken();

				// when
				await ctx.whenCallingMiddleware();

				// then
				ctx.expectAuthHeadersCleared();
				ctx.expectNoTokenExchangeCalled();
				ctx.expectNextCalled();
			});
		});
	});
});
