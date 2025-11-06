import { describe, expect, it, vi, beforeEach, Mock } from 'vitest';
import { Request, Response } from 'express';
import { oboMiddleware, setOBOTokenOnRequest } from './obo-middleware.js';
import { AuthConfig, OboProviderType } from '../config/auth-config.js';
import { Proxy } from '../config/proxy-config.js';
import { TokenValidator } from '../utils/auth/token-validator.js';
import { OboTokenStore } from '../utils/auth/tokenStore/token-store.js';
import { AUTHORIZATION_HEADER, WONDERWALL_ID_TOKEN_HEADER } from '../utils/auth/auth-token-utils.js';

// Mock the dependencies
vi.mock('@navikt/oasis', () => ({
	expiresIn: vi.fn(),
    requestTokenxOboToken: vi.fn(),
    requestAzureOboToken: vi.fn(),
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

// import { createAzureAdOnBehalfOfToken, createTokenXOnBehalfOfToken } from '../utils/auth/auth-client-utils.js';
import {expiresIn, requestAzureOboToken, requestTokenxOboToken, TokenResult} from '@navikt/oasis';

// Request builder utilities
interface RequestConfig {
	authorizationHeader?: string;
	token?: string;
	headers?: Record<string, string>;
}

function createMockRequest(config: RequestConfig = {}): Partial<Request> {
	const headers: Record<string, string> = { ...config.headers };

	if (config.token) {
		headers[AUTHORIZATION_HEADER] = `Bearer ${config.token}`;
	} else if (config.authorizationHeader !== undefined) {
		headers[AUTHORIZATION_HEADER] = config.authorizationHeader;
	}

	return {
		headers,
		header: vi.fn((name: string) => headers[name])
	};
}

// Test context for managing mocks and dependencies
interface TestDependencies {
	// tokenValidator: TokenValidator;
	oboTokenStore: OboTokenStore;
	authConfig: AuthConfig;
	proxy: Proxy;
}

function createTestDependencies(overrides: Partial<TestDependencies> = {}): TestDependencies {
	return {
		oboTokenStore: overrides.oboTokenStore || {
			getUserOboToken: vi.fn(),
			setUserOboToken: vi.fn(),
			deleteUserOboToken: vi.fn(),
			close: vi.fn(),
			cacheType: 'in-memory'
		},
		authConfig: overrides.authConfig || {
			oboProviderType: OboProviderType.AZURE_AD
		} as AuthConfig,
		proxy: overrides.proxy || {
			toApp: { name: 'default-app', cluster: 'dev-gcp', namespace: 'default' },
			fromPath: "/from-path",
			preserveFromPath: true,
			toUrl: '/to-app'
		}
	};
}

function createMockResponse(): { response: Partial<Response>; sendStatusMock: Mock } {
	const sendStatusMock = vi.fn();
	return {
		response: {
			sendStatus: sendStatusMock
		},
		sendStatusMock
	};
}

// Mock setup utilities
function mockTokenValidator(isValid: boolean): TokenValidator {
    return { isValid:  vi.fn((_token: string) => Promise.resolve(isValid)) }
}

function mockCachedOboToken(oboTokenStore: OboTokenStore, token: string | undefined): void {
	(oboTokenStore.getUserOboToken as Mock).mockResolvedValue(token);
}

function mockOasisOboTokenExchange(oboProviderType: OboProviderType, newToken: string, expiresInSeconds: number): void {
	(expiresIn as Mock).mockReturnValue(expiresInSeconds);

	if (oboProviderType === OboProviderType.TOKEN_X) {
		(requestTokenxOboToken as Mock).mockResolvedValue({ ok: true, token: newToken } as TokenResult);
	} else {
		(requestAzureOboToken as Mock).mockResolvedValue({ ok: true, token: newToken } as TokenResult);
	}
}

describe('obo-middleware', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('setOBOTokenOnRequest', () => {
		describe('token validation', () => {
			it('should return 401 when access token is missing', async () => {
				// Arrange
				const request = createMockRequest({});
				const deps = createTestDependencies();
                const tokenValidator = mockTokenValidator(true);

				// Act
				const result = await setOBOTokenOnRequest(
					request as Request,
					tokenValidator,
					deps.oboTokenStore,
					deps.authConfig,
					'some-scope'
				);

				// Assert
				expect(result).toEqual({ status: 401 });
				expect(tokenValidator.isValid).not.toHaveBeenCalled();
			});

			it('should return 401 when Authorization header has invalid format', async () => {
				// Arrange
				const request = createMockRequest({ authorizationHeader: 'invalid-token-without-bearer' });
				const deps = createTestDependencies();
                const tokenValidator = mockTokenValidator(true);

				// Act
				const result = await setOBOTokenOnRequest(
					request as Request,
					tokenValidator,
					deps.oboTokenStore,
					deps.authConfig,
					'some-scope'
				);

				// Assert
				expect(result).toEqual({ status: 401 });
				expect(tokenValidator.isValid).not.toHaveBeenCalled();
			});

			it('should extract token correctly from Bearer format and validate it', async () => {
				// Arrange
				const accessToken = 'mock-access-token';
				const request = createMockRequest({ token: accessToken });
				const deps = createTestDependencies();
				const tokenValidator = mockTokenValidator(true);
				mockCachedOboToken(deps.oboTokenStore, 'cached-token');

				// Act
				const result = await setOBOTokenOnRequest(
					request as Request,
					tokenValidator,
					deps.oboTokenStore,
					deps.authConfig,
					'some-scope'
				);

				// Assert
				expect(result).toBeUndefined();
				expect(tokenValidator.isValid).toHaveBeenCalledWith(accessToken);
			});

			it('should return 401 when access token is invalid', async () => {
				// Arrange
				const accessToken = 'invalid-token';
				const request = createMockRequest({ token: accessToken });
				const deps = createTestDependencies();
                const tokenValidator = mockTokenValidator(false);

				// Act
				const result = await setOBOTokenOnRequest(
					request as Request,
					tokenValidator,
					deps.oboTokenStore,
					deps.authConfig,
					'some-scope'
				);

				// Assert
				expect(result).toEqual({ status: 401 });
				expect(tokenValidator.isValid).toHaveBeenCalledWith(accessToken);
			});
		});

		describe('scope handling', () => {
			it('should clear auth headers when scope is null', async () => {
				// Arrange
				const accessToken = 'mock-access-token';
				const request = createMockRequest({ token: accessToken });
				const deps = createTestDependencies();
                const tokenValidator = mockTokenValidator(true);

				// Act
				const result = await setOBOTokenOnRequest(
					request as Request,
					tokenValidator,
					deps.oboTokenStore,
					deps.authConfig,
					null
				);

				// Assert
				expect(result).toBeUndefined();
				expect(request.headers![AUTHORIZATION_HEADER]).toBe('');
				expect(request.headers![WONDERWALL_ID_TOKEN_HEADER]).toBe('');
				expect(requestAzureOboToken).not.toHaveBeenCalled();
				expect(requestTokenxOboToken).not.toHaveBeenCalled();
			});
		});

		describe('token caching', () => {
			it('should use cached OBO token when available', async () => {
				// Arrange
				const accessToken = 'mock-access-token';
				const cachedToken = 'cached-obo-token';
				const request = createMockRequest({ token: accessToken });
				const deps = createTestDependencies();
                const tokenValidator = mockTokenValidator(true);
				mockCachedOboToken(deps.oboTokenStore, cachedToken);

				// Act
				const result = await setOBOTokenOnRequest(
					request as Request,
					tokenValidator,
					deps.oboTokenStore,
					deps.authConfig,
					'some-scope'
				);

				// Assert
				expect(result).toBeUndefined();
				expect(request.headers![AUTHORIZATION_HEADER]).toBe(`Bearer ${cachedToken}`);
				expect(request.headers![WONDERWALL_ID_TOKEN_HEADER]).toBe('');
				expect(requestAzureOboToken).not.toHaveBeenCalled();
				expect(requestTokenxOboToken).not.toHaveBeenCalled();
			});
		});

		describe('Azure AD token exchange', () => {
			it('should create new Azure AD OBO token when not cached', async () => {
				// Arrange
				const accessToken = 'mock-access-token';
				const newToken = 'new-azure-obo-token';
				const expiresInSeconds = 3600;
				const scope = 'api://cluster.namespace.my-app/.default';
				const request = createMockRequest({ token: accessToken });
				const deps = createTestDependencies({
					authConfig: { oboProviderType: OboProviderType.AZURE_AD } as AuthConfig
				});
                const tokenValidator = mockTokenValidator(true);
				mockCachedOboToken(deps.oboTokenStore, undefined);
				mockOasisOboTokenExchange(OboProviderType.AZURE_AD, newToken, expiresInSeconds);

				// Act
				const result = await setOBOTokenOnRequest(
					request as Request,
					tokenValidator,
					deps.oboTokenStore,
					deps.authConfig,
					scope
				);

				// Assert
				expect(result).toBeUndefined();
				expect(requestAzureOboToken).toHaveBeenCalledWith(accessToken, scope);
				expect(requestAzureOboToken).toHaveBeenCalledTimes(1);
				expect(requestTokenxOboToken).not.toHaveBeenCalled();
				expect(deps.oboTokenStore.setUserOboToken).toHaveBeenCalledWith(
					expect.any(String),
					3570, // 3600 - 30 (clock skew)
					newToken
				);
				expect(request.headers![AUTHORIZATION_HEADER]).toBe(`Bearer ${newToken}`);
				expect(request.headers![WONDERWALL_ID_TOKEN_HEADER]).toBe('');
			});

			it('should apply correct clock skew (30 seconds) to token expiration', async () => {
				// Arrange
				const accessToken = 'mock-access-token';
				const newToken = 'new-obo-token';
				const expiresInSeconds = 3600;
				const expectedExpiryWithSkew = 3570; // 3600 - 30
				const request = createMockRequest({ token: accessToken });
				const deps = createTestDependencies({
					authConfig: { oboProviderType: OboProviderType.AZURE_AD } as AuthConfig
				});
                const tokenValidator = mockTokenValidator(true);
				mockCachedOboToken(deps.oboTokenStore, undefined);
				mockOasisOboTokenExchange(OboProviderType.AZURE_AD, newToken, expiresInSeconds);

				// Act
				await setOBOTokenOnRequest(
					request as Request,
					tokenValidator,
					deps.oboTokenStore,
					deps.authConfig,
					'some-scope'
				);

				// Assert
				expect(deps.oboTokenStore.setUserOboToken).toHaveBeenCalledWith(
					expect.any(String),
					expectedExpiryWithSkew,
					newToken
				);
			});
		});

		describe('TokenX token exchange', () => {
			it('should create new TokenX OBO token when not cached', async () => {
				// Arrange
				const accessToken = 'mock-access-token';
				const newToken = 'new-tokenx-obo-token';
				const expiresInSeconds = 3600;
				const scope = 'dev-gcp:namespace:my-app';
				const request = createMockRequest({ token: accessToken });
				const deps = createTestDependencies({
					authConfig: { oboProviderType: OboProviderType.TOKEN_X } as AuthConfig
				});
                const tokenValidator = mockTokenValidator(true);
				mockCachedOboToken(deps.oboTokenStore, undefined);
				mockOasisOboTokenExchange(OboProviderType.TOKEN_X, newToken, expiresInSeconds);

				// Act
				const result = await setOBOTokenOnRequest(
					request as Request,
					tokenValidator,
					deps.oboTokenStore,
					deps.authConfig,
					scope
				);

				// Assert
				expect(result).toBeUndefined();
				expect(requestTokenxOboToken).toHaveBeenCalledWith(accessToken, scope);
				expect(requestTokenxOboToken).toHaveBeenCalledTimes(1);
				expect(requestAzureOboToken).not.toHaveBeenCalled();
				expect(deps.oboTokenStore.setUserOboToken).toHaveBeenCalledWith(
					expect.any(String),
					3570, // 3600 - 30 (clock skew)
					newToken
				);
				expect(request.headers![AUTHORIZATION_HEADER]).toBe(`Bearer ${newToken}`);
				expect(request.headers![WONDERWALL_ID_TOKEN_HEADER]).toBe('');
			});
		});
	});

	describe('oboMiddleware', () => {
		describe('successful token exchange', () => {
			it('should call next() when token exchange succeeds', async () => {
				// Arrange
				const accessToken = 'mock-access-token';
				const request = createMockRequest({ token: accessToken });
				const { response, sendStatusMock } = createMockResponse();
				const nextMock = vi.fn();
				const deps = createTestDependencies();
                const tokenValidator = mockTokenValidator(true);
				mockCachedOboToken(deps.oboTokenStore, 'cached-token');

				const middleware = oboMiddleware({
					authConfig: deps.authConfig,
					oboTokenStore: deps.oboTokenStore,
					tokenValidator: tokenValidator,
					proxy: deps.proxy
				});

				// Act
				await middleware(request as Request, response as Response, nextMock);

				// Assert
				expect(nextMock).toHaveBeenCalledTimes(1);
				expect(sendStatusMock).not.toHaveBeenCalled();
			});
		});

		describe('error handling', () => {
			it('should send 401 status when token is missing', async () => {
				// Arrange
				const request = createMockRequest({});
				const { response, sendStatusMock } = createMockResponse();
				const nextMock = vi.fn();
				const deps = createTestDependencies();
                const tokenValidator = mockTokenValidator(true);

				const middleware = oboMiddleware({
					authConfig: deps.authConfig,
					oboTokenStore: deps.oboTokenStore,
					tokenValidator: tokenValidator,
					proxy: deps.proxy
				});

				// Act
				await middleware(request as Request, response as Response, nextMock);

				// Assert
				expect(sendStatusMock).toHaveBeenCalledWith(401);
				expect(nextMock).not.toHaveBeenCalled();
			});

			it('should send 401 status when token is invalid', async () => {
				// Arrange
				const accessToken = 'invalid-token';
				const request = createMockRequest({ token: accessToken });
				const { response, sendStatusMock } = createMockResponse();
				const nextMock = vi.fn();
				const deps = createTestDependencies();
                const tokenValidator = mockTokenValidator(false);

				const middleware = oboMiddleware({
					authConfig: deps.authConfig,
					oboTokenStore: deps.oboTokenStore,
					tokenValidator: tokenValidator,
					proxy: deps.proxy
				});

				// Act
				await middleware(request as Request, response as Response, nextMock);

				// Assert
				expect(sendStatusMock).toHaveBeenCalledWith(401);
				expect(nextMock).not.toHaveBeenCalled();
			});
		});

		describe('Azure AD integration', () => {
			it('should create Azure AD scope and exchange token', async () => {
				// Arrange
				const accessToken = 'mock-access-token';
				const newToken = 'new-azure-token';
				const expectedScope = 'api://prod-gcp.obo.my-app/.default';
				const request = createMockRequest({ token: accessToken });
				const { response, sendStatusMock } = createMockResponse();
				const nextMock = vi.fn();
				const deps = createTestDependencies({
					authConfig: { oboProviderType: OboProviderType.AZURE_AD } as AuthConfig,
					proxy: {
						toApp: { name: 'my-app', cluster: 'prod-gcp', namespace: 'obo' },
						fromPath: "/my-app",
						preserveFromPath: true,
						toUrl: '/my-app-url'
					}
				});
                const tokenValidator = mockTokenValidator(true);
                mockCachedOboToken(deps.oboTokenStore, undefined);
				mockOasisOboTokenExchange(OboProviderType.AZURE_AD, newToken, 3600);

				const middleware = oboMiddleware({
					authConfig: deps.authConfig,
					oboTokenStore: deps.oboTokenStore,
					tokenValidator: tokenValidator,
					proxy: deps.proxy
				});

				// Act
				await middleware(request as Request, response as Response, nextMock);

				// Assert
				expect(requestAzureOboToken).toHaveBeenCalledWith(accessToken, expectedScope);
				expect(requestAzureOboToken).toHaveBeenCalledTimes(1);
				expect(requestTokenxOboToken).not.toHaveBeenCalled();
				expect(nextMock).toHaveBeenCalledTimes(1);
				expect(sendStatusMock).not.toHaveBeenCalled();
			});
		});

		describe('TokenX integration', () => {
			it('should create TokenX scope and exchange token', async () => {
				// Arrange
				const accessToken = 'mock-access-token';
				const newToken = 'new-tokenx-token';
				const expectedScope = 'dev-gcp:lol:my-app';
				const request = createMockRequest({ token: accessToken });
				const { response, sendStatusMock } = createMockResponse();
				const nextMock = vi.fn();
				const deps = createTestDependencies({
					authConfig: { oboProviderType: OboProviderType.TOKEN_X } as AuthConfig,
					proxy: {
						toApp: { name: 'my-app', cluster: 'dev-gcp', namespace: 'lol' },
						fromPath: "/from-path",
						preserveFromPath: true,
						toUrl: '/to-app'
					}
				});
                const tokenValidator = mockTokenValidator(true);
                mockCachedOboToken(deps.oboTokenStore, undefined);
				mockOasisOboTokenExchange(OboProviderType.TOKEN_X, newToken, 3600);

				const middleware = oboMiddleware({
					authConfig: deps.authConfig,
					oboTokenStore: deps.oboTokenStore,
					tokenValidator: tokenValidator,
					proxy: deps.proxy
				});

				// Act
				await middleware(request as Request, response as Response, nextMock);

				// Assert
				expect(requestTokenxOboToken).toHaveBeenCalledWith(accessToken, expectedScope);
				expect(requestTokenxOboToken).toHaveBeenCalledTimes(1);
				expect(requestAzureOboToken).not.toHaveBeenCalled();
				expect(nextMock).toHaveBeenCalledTimes(1);
				expect(sendStatusMock).not.toHaveBeenCalled();
			});
		});

		describe('proxy configuration', () => {
			it('should clear auth headers when proxy has no toApp configured', async () => {
				// Arrange
				const accessToken = 'mock-access-token';
				const request = createMockRequest({ token: accessToken });
				const { response, sendStatusMock } = createMockResponse();
				const nextMock = vi.fn();
				const deps = createTestDependencies({
					proxy: {
						toApp: undefined,
						fromPath: "/from-path",
						preserveFromPath: true,
						toUrl: '/to-app'
					}
				});
                const tokenValidator = mockTokenValidator(true);

				const middleware = oboMiddleware({
					authConfig: deps.authConfig,
					oboTokenStore: deps.oboTokenStore,
					tokenValidator: tokenValidator,
					proxy: deps.proxy
				});

				// Act
				await middleware(request as Request, response as Response, nextMock);

				// Assert
				expect(request.headers![AUTHORIZATION_HEADER]).toBe('');
				expect(request.headers![WONDERWALL_ID_TOKEN_HEADER]).toBe('');
				expect(requestAzureOboToken).not.toHaveBeenCalled();
				expect(requestTokenxOboToken).not.toHaveBeenCalled();
				expect(nextMock).toHaveBeenCalledTimes(1);
				expect(sendStatusMock).not.toHaveBeenCalled();
			});
		});
	});
});
