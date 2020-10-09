import { Request, Response } from 'express';
import NodeCache from 'node-cache';
import { Storage } from '@google-cloud/storage';
import mime from 'mime-types';
import { extname } from 'path';
import urlJoin from 'url-join';
import { readFileSync } from 'fs';
import { FallbackStrategy } from './environment';
import { logger } from './logger';
import { hoursToSeconds, minutesToSeconds, stripStartPath } from './utils';

// Used to cache requests to static resources that NEVER change
const staticCache = new NodeCache({
	stdTTL: hoursToSeconds(12)
});

// Used to cache files that can change at any moment from a dep
const volatileCache = new NodeCache({
	stdTTL: minutesToSeconds(5)
});

interface GcsRouterConfig {
	gcsServiceAccountPath: string;
	bucketName: string;
	bucketPrefixPath?: string;
	contextPath: string;
	fallbackStrategy: FallbackStrategy;
}

export function gcsRouter(config: GcsRouterConfig) {
	const saToken = readFileSync(config.gcsServiceAccountPath).toString();
	const storage = new Storage();
	const bucket = storage.bucket(config.bucketName);

	return (req: Request, res: Response) => {
		if (req.method !== 'GET') {
			// We only serve resources so only GET is allowed
			res.sendStatus(409); // Method not allowed
		}

		// TODO: Try cache first if not found then go to bucket

		const strippedPath = config.contextPath === '/'
			? req.path
			: stripStartPath(req.path, config.contextPath);

		let bucketFilePath = config.bucketPrefixPath
			? urlJoin(config.bucketPrefixPath, strippedPath)
			: strippedPath;

		// Bucket file paths should not start with /
		bucketFilePath = bucketFilePath.startsWith('/')
			? bucketFilePath.substring(1)
			: bucketFilePath;

		logger.info('bucketFilePath ' + bucketFilePath);

		const file = bucket.file(bucketFilePath);

		file.download(function(err, content) {
			if (err) {
				logger.warn('Fant ikke fil for request: ' + req.originalUrl, err);
				// TODO: Use fallback strategy
				res.sendStatus(404);
			} else {
				const contentType = mime.lookup(extname(bucketFilePath)) || 'application/octet-stream';
				res.setHeader('Content-Type', contentType);
				res.send(content);
			}
		});
	};
}

