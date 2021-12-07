import { createScope } from './auth-client-utils';

describe('createScope', () => {
	it('should create scope and filter values', () => {
		expect(createScope(['test', null, '', 'test2', undefined])).toBe('test test2');
	});
});
