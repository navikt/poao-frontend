import { describe, it, expect } from 'vitest';
import { normalizePathParams } from './logger.js';

describe('normalizePathParams', () => {
	it('should normalize numeric path param to <id>', () => {
		expect(
			normalizePathParams('/path1/123456/path2')).toBe('/path1/<id>/path2');
	})
	it('even when id is last', () => {
		expect(normalizePathParams('/path1/path2/123456')).toBe('/path1/path2/<id>');
	})
	it('or first', () => {
		expect(normalizePathParams('/123456/path1/path2')).toBe('/<id>/path1/path2');
	})
	it('or has multiple ids', () => {
		expect(normalizePathParams('/123456/path1/234566')).toBe('/<id>/path1/<id>');
	})
	it('should normalize uuid path param to <uuid>', () => {
		expect(normalizePathParams('/path1/080f0f35-d8ab-47c0-b919-fe744361f39a/path2')).toBe('/path1/<uuid>/path2');
	})
	it('should handle mixed ids', () => {
		expect(normalizePathParams('/path1/080f0f35-d8ab-47c0-b919-fe744361f39a/path2/12345')).toBe('/path1/<uuid>/path2/<id>');
	})

});

