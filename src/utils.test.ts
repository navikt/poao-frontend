import { hoursToMs, stripStartPath } from './utils';

describe('hoursToMs', () => {
	it('should convert hours to milliseconds', () => {
		expect(hoursToMs(1)).toBe(3600000);
	})
});

describe('stripStartPath', () => {
	it('should strip start of path', () => {
		expect(stripStartPath('/test/path', '/test')).toBe('/path');
		expect(stripStartPath('/test/path', '/test1')).toBe('/test/path');
	})
});