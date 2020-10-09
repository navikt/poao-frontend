import { Request } from 'express';
import { format } from 'url';

export function getFullUrl(req: Request): string {
	return format({
		protocol: process.env.NODE_ENV === 'development' ? 'http' : 'https',
		host: req.get('host'),
		pathname: req.originalUrl
	});
}

export function hoursToMs(hours: number): number {
	return hours * 60 * 60 * 1000;
}

export function hoursToSeconds(hours: number): number {
	return hours * 60 * 60;
}

export function minutesToSeconds(minutes: number): number {
	return minutes * 60;
}

export function stripStartPath(path: string, startPath: string): string {
	if (path.startsWith(startPath)) {
		return path.substring(startPath.length);
	}

	return path;
}
