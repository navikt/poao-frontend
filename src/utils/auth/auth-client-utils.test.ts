import { describe, expect, it } from 'vitest';
import { createScope } from './auth-client-utils.js';

describe('createScope', () => {
	it('should create scope and filter values', () => {
		expect(createScope(['test', null, '', 'test2', undefined])).toBe('test test2');
	});
});
