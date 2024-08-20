import { BaseConfig, FallbackStrategy } from '../config/base-config.js';
import { isRequestingFile } from '../utils/utils.js';
import { join } from 'path';
import { Request, Response } from 'express';
import { injectDecoratorServerSide } from "@navikt/nav-dekoratoren-moduler/ssr/index.js";
import { JsonConfig } from "../config/app-config-resolver.js";
import DekoratorConfig = JsonConfig.DekoratorConfig;
import { logger } from "../utils/logger.js";
import { CALL_ID, CONSUMER_ID } from "../middleware/tracingMiddleware.js";

export function fallbackRoute(baseConfig: BaseConfig, dekorator?: DekoratorConfig) {
	return (req: Request, res: Response) => {
		// If the user is requesting a file such as /path/to/img.png then we should always return 404 if the file does not exist
		if (baseConfig.fallbackStrategy === FallbackStrategy.NONE || isRequestingFile(req.path)) {
			res.sendStatus(404);
		} else if (baseConfig.fallbackStrategy === FallbackStrategy.REDIRECT_TO_ROOT) {
			res.redirect(baseConfig.contextPath);
		} else if (baseConfig.fallbackStrategy === FallbackStrategy.SERVE_INDEX_HTML) {
			if (dekorator) {
				injectDecoratorServerSide({
					env: dekorator.env,
					filePath: join(baseConfig.serveFromPath, "index.html"),
					params: {
						simple: dekorator.simple,
						chatbot: dekorator.chatbot
					}
				})
					.then((html) => {
						res.send(html);
					})
					.catch((e) => logger.error({
						message: e,
						callId: req.headers[CALL_ID],
						consumerId: req.headers[CONSUMER_ID]
					}))
			} else {
				res.sendFile(join(baseConfig.serveFromPath, 'index.html'));
			}
		} else {
			throw new Error('Unsupported strategy ' + baseConfig.fallbackStrategy);
		}
	}
}
