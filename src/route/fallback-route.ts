import { BaseConfig, FallbackStrategy } from '../config/base-config';
import { isRequestingFile } from '../utils/utils';
import { join } from 'path';
import { Request, Response } from 'express';

export function fallbackRoute(baseConfig: BaseConfig) {
	return (req: Request, res: Response) => {
		// If the user is requesting a file such as /path/to/img.png then we should always return 404 if the file does not exist
		if (baseConfig.fallbackStrategy === FallbackStrategy.NONE || isRequestingFile(req.path)) {
			res.sendStatus(404);
		} else if (baseConfig.fallbackStrategy === FallbackStrategy.REDIRECT) {
			res.redirect(baseConfig.contextPath);
		} else if (baseConfig.fallbackStrategy === FallbackStrategy.SERVE) {
			res.sendFile(join(baseConfig.serveFromPath, 'index.html'));
		} else {
			throw new Error('Unsupported strategy ' + baseConfig.fallbackStrategy);
		}
	}
}
