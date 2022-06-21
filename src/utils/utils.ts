import mime from 'mime-types';
import { extname } from "path";

export function hoursToMs(hours: number): number {
	return hours * 60 * 60 * 1000;
}

export function hoursToSeconds(hours: number): number {
	return hours * 60 * 60;
}

export function minutesToSeconds(minutes: number): number {
	return minutes * 60;
}

/*
	Checks if the request path references a file such as /path/to/img.png
	Ex:
		/path/to/img.png -> true
		/path/to/img.png?hello=world -> true
		/path/to/something -> false
 */
export function isRequestingFile(requestPath: string): boolean {
	return !!mime.lookup(extname(removeQueryParams(requestPath)));
}

export function removeQueryParams(requestPath: string): string {
	const queryParamStart = requestPath.indexOf('?');
	return queryParamStart >= 0 ? requestPath.substring(0, queryParamStart) : requestPath;
}

export function getMimeType(path: string): string {
	return mime.lookup(extname(path)) || 'application/octet-stream';
}

export function stripPrefix(sourceStr: string, prefixToStrip: string): string {
	if (sourceStr.startsWith(prefixToStrip)) {
		return sourceStr.substring(prefixToStrip.length);
	}

	return sourceStr;
}

export function fromBase64(base64Str: string): string {
	return Buffer.from(base64Str, 'base64').toString('utf8');
}
