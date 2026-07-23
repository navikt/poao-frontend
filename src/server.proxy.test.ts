import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import http from 'node:http';
import { proxyMiddleware } from './middleware/proxy-middleware.js';
import { oboMiddleware } from './middleware/obo-middleware.js';
import { LoginProviderType, OboProviderType } from './config/auth-config.js';
import type { OboTokenStore } from './utils/auth/tokenStore/token-store.js';
import { routeUrl } from './utils/utils.js';
import type { Proxy } from './config/proxy-config.js';

vi.mock('./utils/logger.js', () => ({
logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
normalizePathParams: (p: string) => p,
}));

vi.mock('@navikt/oasis', () => ({
validateAzureToken: vi.fn().mockResolvedValue({ ok: true }),
validateIdportenToken: vi.fn().mockResolvedValue({ ok: true }),
expiresIn: vi.fn().mockReturnValue(3600),
requestAzureOboToken: vi.fn().mockResolvedValue({ ok: true, token: 'mock-obo-token' }),
requestTokenxOboToken: vi.fn().mockResolvedValue({ ok: true, token: 'mock-obo-token' }),
}));

process.env['NAIS_APP_NAME'] = 'test-app';

interface CapturedRequest {
method: string;
path: string;
headers: Record<string, string | string[] | undefined>;
}

function startServer(app: express.Application): Promise<{ server: http.Server; port: number }> {
return new Promise(resolve => {
const server = app.listen(0, '127.0.0.1', () => {
const port = (server.address() as { port: number }).port;
resolve({ server, port });
});
});
}

function stopServer(server: http.Server): Promise<void> {
return new Promise(resolve => server.close(() => resolve()));
}

function buildProxy(targetPort: number, overrides: Partial<Proxy> = {}): Proxy {
return {
fromPath: '/api',
toUrl: `http://127.0.0.1:${targetPort}`,
preserveFromPath: false,
toApp: { name: 'test-app', namespace: 'test-ns', cluster: 'dev-gcp' },
...overrides,
};
}

const azureAuthConfig = {
loginProviderType: LoginProviderType.AZURE_AD,
oboProviderType: OboProviderType.AZURE_AD,
} as const;

function buildOboTokenStore(oboToken = 'cached-obo-token'): OboTokenStore {
return {
getUserOboToken: vi.fn().mockResolvedValue(oboToken),
setUserOboToken: vi.fn().mockResolvedValue(undefined),
deleteUserOboToken: vi.fn().mockResolvedValue(undefined),
close: vi.fn().mockResolvedValue(undefined),
cacheType: 'in-memory',
};
}

describe('proxy forwarding (server.ts proxy setup)', () => {
let targetServer: http.Server;
let targetPort: number;
let capturedRequests: CapturedRequest[];

beforeAll(async () => {
const targetApp = express();
targetApp.use((req, res) => {
capturedRequests.push({
method: req.method,
path: req.path,
headers: req.headers as Record<string, string | string[] | undefined>,
});
res.status(200).json({ ok: true });
});
({ server: targetServer, port: targetPort } = await startServer(targetApp));
});

afterAll(() => stopServer(targetServer));
beforeEach(() => { capturedRequests = []; });

// =========================================================================
// Without auth
// =========================================================================

describe('no auth | contextPath=/ | preserveFromPath=false', () => {
	let proxyServer: http.Server;
	let proxyPort: number;

	beforeAll(async () => {
	const proxy = buildProxy(targetPort, { preserveFromPath: false });
	const app = express();
	const proxyFrom = routeUrl(proxy.fromPath, '/');
	app.use(proxyFrom, proxyMiddleware(proxyFrom, proxy));
	({ server: proxyServer, port: proxyPort } = await startServer(app));
	});

	afterAll(() => stopServer(proxyServer));
	beforeEach(() => { capturedRequests = []; });

	it('forwards the request to the target', async () => {
	const res = await fetch(`http://127.0.0.1:${proxyPort}/api/data`);
	expect(res.status).toBe(200);
	expect(capturedRequests).toHaveLength(1);
	});

	it('strips /api prefix – target receives path without fromPath', async () => {
	await fetch(`http://127.0.0.1:${proxyPort}/api/resource/123`);
	expect(capturedRequests[0].path).toBe('/resource/123');
	});

	it('forwards custom request headers to the target', async () => {
	await fetch(`http://127.0.0.1:${proxyPort}/api/check`, {
	headers: { 'x-custom-header': 'hello-world' },
	});
	expect(capturedRequests[0].headers['x-custom-header']).toBe('hello-world');
	});

	it('preserves the HTTP method', async () => {
	await fetch(`http://127.0.0.1:${proxyPort}/api/submit`, { method: 'POST' });
	expect(capturedRequests[0].method).toBe('POST');
	});
});

describe('no auth | contextPath=/ | preserveFromPath=true', () => {
	let proxyServer: http.Server;
	let proxyPort: number;

	beforeAll(async () => {
		const proxy = buildProxy(targetPort, { preserveFromPath: true });
		const app = express();
		const proxyFrom = routeUrl(proxy.fromPath, '/');
		app.use(proxyFrom, proxyMiddleware(proxyFrom, proxy));
		({ server: proxyServer, port: proxyPort } = await startServer(app));
	});

	afterAll(() => stopServer(proxyServer));
	beforeEach(() => { capturedRequests = []; });

	it('forwards the request to the target', async () => {
		const res = await fetch(`http://127.0.0.1:${proxyPort}/api/data`);
		expect(res.status).toBe(200);
		expect(capturedRequests).toHaveLength(1);
	});

	it('target receives full path including /api prefix', async () => {
		await fetch(`http://127.0.0.1:${proxyPort}/api/resource/123`);
		expect(capturedRequests[0].path).toBe('/api/resource/123');
		});
	});

	describe('no auth | contextPath=/my-app | preserveFromPath=false', () => {
	let proxyServer: http.Server;
	let proxyPort: number;

	beforeAll(async () => {
	const proxy = buildProxy(targetPort, { preserveFromPath: false });
	const app = express();
	const proxyFrom = routeUrl(proxy.fromPath, '/my-app');
	app.use(proxyFrom, proxyMiddleware(proxyFrom, proxy));
	({ server: proxyServer, port: proxyPort } = await startServer(app));
	});

	afterAll(() => stopServer(proxyServer));
	beforeEach(() => { capturedRequests = []; });

	it('forwards the request to the target', async () => {
	const res = await fetch(`http://127.0.0.1:${proxyPort}/my-app/api/data`);
	expect(res.status).toBe(200);
	expect(capturedRequests).toHaveLength(1);
	});

	it('strips /my-app/api prefix – target receives path without contextPath and fromPath', async () => {
	await fetch(`http://127.0.0.1:${proxyPort}/my-app/api/resource/123`);
	expect(capturedRequests[0].path).toBe('/resource/123');
	});
	});

describe('no auth | contextPath=/my-app | preserveFromPath=true', () => {
	let proxyServer: http.Server;
	let proxyPort: number;

	beforeAll(async () => {
		const proxy = buildProxy(targetPort, { preserveFromPath: true });
		const app = express();
		const proxyFrom = routeUrl(proxy.fromPath, '/my-app');
		app.use(proxyFrom, proxyMiddleware(proxyFrom, proxy));
		({ server: proxyServer, port: proxyPort } = await startServer(app));
	});

	afterAll(() => stopServer(proxyServer));
	beforeEach(() => { capturedRequests = []; });

	it('forwards the request to the target', async () => {
		const res = await fetch(`http://127.0.0.1:${proxyPort}/my-app/api/data`);
		expect(res.status).toBe(200);
		expect(capturedRequests).toHaveLength(1);
	});

	it('target receives full path including contextPath and fromPath prefix', async () => {
		await fetch(`http://127.0.0.1:${proxyPort}/my-app/api/resource/123`);
		expect(capturedRequests[0].path).toBe('/my-app/api/resource/123');
	});
	});

	// =========================================================================
	// With auth (oboMiddleware + proxyMiddleware)
	// =========================================================================

	describe('with auth | contextPath=/ | preserveFromPath=false', () => {
		let proxyServer: http.Server;
		let proxyPort: number;

		beforeAll(async () => {
		const proxy = buildProxy(targetPort, { preserveFromPath: false });
		const app = express();
		const proxyFrom = routeUrl(proxy.fromPath, '/');
		app.use(
		proxyFrom,
		oboMiddleware({ authConfig: azureAuthConfig, proxy, oboTokenStore: buildOboTokenStore() }),
		proxyMiddleware(proxyFrom, proxy),
		);
		({ server: proxyServer, port: proxyPort } = await startServer(app));
		});

		afterAll(() => stopServer(proxyServer));
		beforeEach(() => { capturedRequests = []; });

		it('forwards the request when a valid Bearer token is provided', async () => {
		const res = await fetch(`http://127.0.0.1:${proxyPort}/api/data`, {
		headers: { Authorization: 'Bearer valid-access-token' },
		});
		expect(res.status).toBe(200);
		expect(capturedRequests).toHaveLength(1);
		});

		it('strips /api prefix – target receives path without fromPath', async () => {
		await fetch(`http://127.0.0.1:${proxyPort}/api/resource/123`, {
		headers: { Authorization: 'Bearer valid-access-token' },
		});
		expect(capturedRequests[0].path).toBe('/resource/123');
		});

		it('replaces Authorization header with OBO token on the forwarded request', async () => {
		await fetch(`http://127.0.0.1:${proxyPort}/api/check`, {
		headers: { Authorization: 'Bearer valid-access-token' },
		});
		expect(capturedRequests[0].headers['authorization']).toBe('Bearer cached-obo-token');
		});

		it('returns 401 and does not forward when no Authorization header is provided', async () => {
		const res = await fetch(`http://127.0.0.1:${proxyPort}/api/data`);
		expect(res.status).toBe(401);
		expect(capturedRequests).toHaveLength(0);
		});
	});

	describe('with auth | contextPath=/ | preserveFromPath=true', () => {
		let proxyServer: http.Server;
		let proxyPort: number;

		beforeAll(async () => {
		const proxy = buildProxy(targetPort, { preserveFromPath: true });
		const app = express();
		const proxyFrom = routeUrl(proxy.fromPath, '/');
		app.use(
		proxyFrom,
		oboMiddleware({ authConfig: azureAuthConfig, proxy, oboTokenStore: buildOboTokenStore() }),
		proxyMiddleware(proxyFrom, proxy),
		);
		({ server: proxyServer, port: proxyPort } = await startServer(app));
		});

		afterAll(() => stopServer(proxyServer));
		beforeEach(() => { capturedRequests = []; });

		it('forwards the request when a valid Bearer token is provided', async () => {
		const res = await fetch(`http://127.0.0.1:${proxyPort}/api/data`, {
		headers: { Authorization: 'Bearer valid-access-token' },
		});
		expect(res.status).toBe(200);
		expect(capturedRequests).toHaveLength(1);
		});

		it('target receives full path including /api prefix', async () => {
		await fetch(`http://127.0.0.1:${proxyPort}/api/resource/123`, {
		headers: { Authorization: 'Bearer valid-access-token' },
		});
		expect(capturedRequests[0].path).toBe('/api/resource/123');
		});

		it('returns 401 and does not forward when no Authorization header is provided', async () => {
		const res = await fetch(`http://127.0.0.1:${proxyPort}/api/data`);
		expect(res.status).toBe(401);
		expect(capturedRequests).toHaveLength(0);
		});
	});

	describe('with auth | contextPath=/my-app | preserveFromPath=false', () => {
		let proxyServer: http.Server;
		let proxyPort: number;

		beforeAll(async () => {
		const proxy = buildProxy(targetPort, { preserveFromPath: false });
		const app = express();
		const proxyFrom = routeUrl(proxy.fromPath, '/my-app');
		app.use(
		proxyFrom,
		oboMiddleware({ authConfig: azureAuthConfig, proxy, oboTokenStore: buildOboTokenStore() }),
		proxyMiddleware(proxyFrom, proxy),
		);
		({ server: proxyServer, port: proxyPort } = await startServer(app));
		});

		afterAll(() => stopServer(proxyServer));
		beforeEach(() => { capturedRequests = []; });

		it('forwards the request when a valid Bearer token is provided', async () => {
		const res = await fetch(`http://127.0.0.1:${proxyPort}/my-app/api/data`, {
		headers: { Authorization: 'Bearer valid-access-token' },
		});
		expect(res.status).toBe(200);
		expect(capturedRequests).toHaveLength(1);
		});

		it('strips /my-app/api prefix – target receives path without contextPath and fromPath', async () => {
		await fetch(`http://127.0.0.1:${proxyPort}/my-app/api/resource/123`, {
		headers: { Authorization: 'Bearer valid-access-token' },
		});
		expect(capturedRequests[0].path).toBe('/resource/123');
		});

		it('returns 401 and does not forward when no Authorization header is provided', async () => {
		const res = await fetch(`http://127.0.0.1:${proxyPort}/my-app/api/data`);
		expect(res.status).toBe(401);
		expect(capturedRequests).toHaveLength(0);
		});
	});

	describe('with auth | contextPath=/my-app | preserveFromPath=true', () => {
		let proxyServer: http.Server;
		let proxyPort: number;

		beforeAll(async () => {
		const proxy = buildProxy(targetPort, { preserveFromPath: true });
		const app = express();
		const proxyFrom = routeUrl(proxy.fromPath, '/my-app');
		app.use(
		proxyFrom,
		oboMiddleware({ authConfig: azureAuthConfig, proxy, oboTokenStore: buildOboTokenStore() }),
		proxyMiddleware(proxyFrom, proxy),
		);
		({ server: proxyServer, port: proxyPort } = await startServer(app));
		});

		afterAll(() => stopServer(proxyServer));
		beforeEach(() => { capturedRequests = []; });

		it('forwards the request when a valid Bearer token is provided', async () => {
		const res = await fetch(`http://127.0.0.1:${proxyPort}/my-app/api/data`, {
		headers: { Authorization: 'Bearer valid-access-token' },
		});
		expect(res.status).toBe(200);
		expect(capturedRequests).toHaveLength(1);
		});

		it('target receives full path including contextPath and fromPath prefix', async () => {
		await fetch(`http://127.0.0.1:${proxyPort}/my-app/api/resource/123`, {
		headers: { Authorization: 'Bearer valid-access-token' },
		});
		expect(capturedRequests[0].path).toBe('/my-app/api/resource/123');
		});

		it('returns 401 and does not forward when no Authorization header is provided', async () => {
		const res = await fetch(`http://127.0.0.1:${proxyPort}/my-app/api/data`);
		expect(res.status).toBe(401);
		expect(capturedRequests).toHaveLength(0);
		});
	});
});
