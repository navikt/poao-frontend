import { hoursToMs, hoursToSeconds, minutesToSeconds, stripStartPath } from './utils';

describe('hoursToMs', () => {
	it('should convert hours to milliseconds', () => {
		expect(hoursToMs(1)).toBe(3600000);
	})
});

describe('hoursToSeconds', () => {
	it('should convert hours to seconds', () => {
		expect(hoursToSeconds(2)).toBe(7200);
	})
});

describe('minutesToSeconds', () => {
	it('should convert minutes to seconds', () => {
		expect(minutesToSeconds(5)).toBe(300);
	})
});


describe('stripStartPath', () => {
	it('should strip start of path', () => {
		expect(stripStartPath('/test/path', '/test')).toBe('/path');
		expect(stripStartPath('/test/path', '/test1')).toBe('/test/path');
	})
});