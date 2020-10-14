import { Request, Response } from 'express';
import NodeCache from 'node-cache';
import { Bucket, Storage } from '@google-cloud/storage';
import urlJoin from 'url-join';
import env, { FallbackStrategy } from './config/environment';
import { logger } from './logger';
import {
	getMimeType,
	hoursToSeconds,
	isRequestingFile,
	minutesToSeconds,
	removeQueryParams,
	stripPrefix
} from './utils/utils';

// Used to cache requests to static resources that NEVER change
const staticCache = new NodeCache({
	stdTTL: hoursToSeconds(12)
});

// Used to cache files that can change during deployment of a new version (index.html, asset-manifest.json etc...)
const volatileCache = new NodeCache({
	stdTTL: minutesToSeconds(5),
	checkperiod: 120 // 2 minutes
});

interface GcsRouterConfig {
	bucketName: string;
	bucketContextPath?: string;
	contextPath: string;
	fallbackStrategy: FallbackStrategy;
}

// All resource inside static/ are considered to be static and can be cached forever
function isStaticResource(bucketFilePath: string): boolean {
	return bucketFilePath.startsWith('static');
}

function updateCache(bucketFilePath: string, content: Buffer): void {
	if (isStaticResource(bucketFilePath)) {
		staticCache.set(bucketFilePath, content);
	} else {
		volatileCache.set(bucketFilePath, content);
	}
}

function readFromCache(bucketFilePath: string): Buffer | undefined {
	if (isStaticResource(bucketFilePath)) {
		return staticCache.get<Buffer>(bucketFilePath);
	} else {
		return volatileCache.get<Buffer>(bucketFilePath);
	}
}

function sendContent(res: Response, bucketFilePath: string, content: Buffer) {
	if (isStaticResource(bucketFilePath)) {
		res.setHeader('Cache-Control', 'public, immutable, max-age=604800'); // 1 week expiration
	}

	res.setHeader('Content-Type', getMimeType(bucketFilePath));
	res.send(content);
}

function getFileFromCacheOrBucket(bucket: Bucket, bucketFilePath: string): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const cachedContent = readFromCache(bucketFilePath);

		if (cachedContent) {
			resolve(cachedContent);
			return;
		}

		const file = bucket.file(bucketFilePath);

		file.download(function(err, content) {
			if (err) {
				reject(err);
			} else {
				updateCache(bucketFilePath, content);
				resolve(content);
			}
		});
	});
}

function defaultBucketFilePath(config: GcsRouterConfig): string {
	return stripPrefix(urlJoin(config.bucketContextPath || '', 'index.html'), '/');
}

function createBucketFilePath(requestPath: string, config: GcsRouterConfig): string {
	requestPath = removeQueryParams(requestPath);

	const strippedPath = config.contextPath === '/'
		? requestPath
		: stripPrefix(requestPath, config.contextPath);

	if (strippedPath === '' || strippedPath === '/') {
		return defaultBucketFilePath(config);
	}

	let bucketFilePath = config.bucketContextPath
		? urlJoin(config.bucketContextPath, strippedPath)
		: strippedPath;

	// Bucket file paths cannot not start with /
	return stripPrefix(bucketFilePath, '/');
}

export function gcsRouter(config: GcsRouterConfig) {
	const storage = new Storage();
	const bucket = storage.bucket(config.bucketName);

	return (req: Request, res: Response) => {
		if (req.method !== 'GET') {
			// We only serve resources so only GET is allowed
			res.sendStatus(409); // Method not allowed
			return;
		}

		const bucketFilePath = createBucketFilePath(req.path, config);

		getFileFromCacheOrBucket(bucket, bucketFilePath)
			.then(fileContent => {
				sendContent(res, bucketFilePath, fileContent);
			})
			.catch(err => {
				logger.warn('Fant ikke fil med path: ' + bucketFilePath, err);

				// If the user is requesting a file such as /path/to/img.png then we should always return 404 if the file does not exist
				if (config.fallbackStrategy === FallbackStrategy.NONE || isRequestingFile(bucketFilePath)) {
					res.sendStatus(404);
				} else if (config.fallbackStrategy === FallbackStrategy.REDIRECT) {
					res.redirect(config.contextPath);
				} else if (config.fallbackStrategy === FallbackStrategy.SERVE) {
					const defaultFilePath = defaultBucketFilePath(config);

					getFileFromCacheOrBucket(bucket, defaultFilePath)
						.then(content => {
							sendContent(res, defaultFilePath, content);
						})
						.catch(() => {
							logger.info('Fant ikke default fil for FallbackStrategy.SERVE: ' + defaultFilePath);
							res.sendStatus(404);
						});
				} else {
					throw new Error('Unsupported strategy ' + env.fallbackStrategy);
				}
			});
	};
}

