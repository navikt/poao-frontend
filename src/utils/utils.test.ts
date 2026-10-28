import { describe, it, expect } from 'vitest';
import {
	hoursToMs,
	hoursToSeconds,
	isRequestingFile,
	joinUrlPath,
	minutesToSeconds,
	removeQueryParams,
	stripPrefix
} from './utils.js';

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

describe('removeQueryParams', () => {
	it('should remove query params', () => {
		expect(removeQueryParams('/some/path/test?hello=world')).toBe('/some/path/test');
	});

	it('should not change if no query params', () => {
		expect(removeQueryParams('/some/path/test')).toBe('/some/path/test');
	});
});

describe('stripPrefix', () => {
	it('should strip prefix', () => {
		expect(stripPrefix('/test/path', '/test')).toBe('/path');
		expect(stripPrefix('/test/path', '/test1')).toBe('/test/path');
	})
});

describe('joinUrlPath', () => {
	it('should join relative paths', () => {
		expect(joinUrlPath('/my-app/', '/api/*path')).toBe('/my-app/api/*path');
		expect(joinUrlPath('build', '/some/file.js')).toBe('build/some/file.js');
		expect(joinUrlPath('', 'index.html')).toBe('index.html');
		expect(joinUrlPath('localhost:3000', '/next')).toBe('localhost:3000/next');
	});

	it('should preserve the origin for absolute URLs', () => {
		expect(joinUrlPath('https://example.com/base', '/next')).toBe('https://example.com/base/next');
	});

	it('should preserve parent path segments without resolving them', () => {
		expect(joinUrlPath('build', '/../secret.json')).toBe('build/../secret.json');
		expect(joinUrlPath('https://example.com/base', '/../next')).toBe('https://example.com/base/../next');
	});

	it('should not add a trailing slash when the path is empty', () => {
		expect(joinUrlPath('/my-app/', '')).toBe('/my-app');
	});
});
