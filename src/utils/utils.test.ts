import { hoursToMs, hoursToSeconds, isRequestingFile, minutesToSeconds, stripPrefix } from './utils';

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

describe('isRequestingFile', () => {
	it('should check if path is requesting file', () => {
		expect(isRequestingFile('/some/path/img.png')).toBe(true);
	});

	it('should check if path is requesting file with query params', () => {
		expect(isRequestingFile('/some/path/img.png?hello=world')).toBe(true);
	});

	it('should check if path is NOT requesting file', () => {
		expect(isRequestingFile('')).toBe(false);
		expect(isRequestingFile('/some/path/img')).toBe(false);
	});
});

describe('stripPrefix', () => {
	it('should strip prefix', () => {
		expect(stripPrefix('/test/path', '/test')).toBe('/path');
		expect(stripPrefix('/test/path', '/test1')).toBe('/test/path');
	})
});