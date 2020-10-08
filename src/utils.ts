import { Request } from 'express';
import { format } from 'url';

export function getFullUrl(req: Request): string {
	return format({
		protocol: 'https', // SSL is terminated before reaching the server, so we cannot use req.protocol
		host: req.get('host'),
		pathname: req.originalUrl
	});
}

export function hoursToMs(hours: number): number {
	return hours * 60 * 60 * 1000;
}

/**
 * Joins url segments with '/'.
 * Will not work for segments that start with more than 1 '/'.
 * @param segments url segments that will be joined
 */
export function joinUrlSegments(...segments: string[]): string {
	return segments
		.map((segment, idx) => {
			return segment.startsWith('/') && idx > 0
				? segment.slice(1)
				: segment;
		}).join('/');
}