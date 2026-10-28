import { describe, expect, it, vi } from 'vitest';
import { Request, Response } from 'express';
import { redirectRoute } from './redirect-route.js';

function createRequest(path: string, query: Request['query'] = {}): Request {
	return { path, query } as Request;
}

function createResponse() {
	const redirect = vi.fn();
	const response: Partial<Response> = { redirect };

	return { redirect, response: response as Response };
}

describe('redirectRoute', () => {
	it('should preserve the request path and query parameters', () => {
		const { redirect, response } = createResponse();
		const route = redirectRoute({
			fromPath: '/old',
			to: 'https://example.com/base',
			preserveContextPath: true
		});

		route(createRequest('/next', { foo: '123', bar: '456' }), response);

		expect(redirect).toHaveBeenCalledWith('https://example.com/base/next?foo=123&bar=456');
	});

	it('should replace a wildcard context path', () => {
		const { redirect, response } = createResponse();
		const route = redirectRoute({
			fromPath: '/old/*',
			to: '/new',
			preserveContextPath: false
		});

		route(createRequest('/old/next'), response);

		expect(redirect).toHaveBeenCalledWith('/new/next');
	});

	it('should use the configured target for a route without a wildcard', () => {
		const { redirect, response } = createResponse();
		const route = redirectRoute({
			fromPath: '/old',
			to: '/new',
			preserveContextPath: false
		});

		route(createRequest('/old'), response);

		expect(redirect).toHaveBeenCalledWith('/new');
	});
});
