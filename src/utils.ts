import { Request } from 'express';
import { format } from 'url';

export function getFullUrl(req: Request): string {
	return format({
		protocol: req.protocol,
		host: req.get('host'),
		pathname: req.originalUrl
	});
}

export function hoursToMs(hours: number): number {
	return hours * 60 * 60 * 1000;
}