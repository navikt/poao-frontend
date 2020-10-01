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
 * @param segements url segments that will be joined
 */
export function joinUrlSegments(...segements: string[]): string {
	return segements
		.map(segment => {
			return segment.startsWith('/')
				? segment.slice(1)
				: segment;
		}).join('/');
}