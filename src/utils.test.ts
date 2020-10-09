import { hoursToMs, hoursToSeconds, minutesToSeconds, stripPrefix } from './utils';

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


describe('stripPrefix', () => {
	it('should strip prefix', () => {
		expect(stripPrefix('/test/path', '/test')).toBe('/path');
		expect(stripPrefix('/test/path', '/test1')).toBe('/test/path');
	})
});