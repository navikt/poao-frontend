import { Request, Response } from 'express';
import urljoin from "url-join";
import { stringify, unescape } from "querystring";

export interface RedirectRouterConfig {
	fromPath: string
	to: string
	preserveContextPath: boolean
}

export function redirectRoute(config: RedirectRouterConfig) {
	return (req: Request, res: Response) => {
		const queryStr = getQueryString(req)

		if (config.preserveContextPath) {
			const url = urljoin(config.to, req.path);
			res.redirect(url + queryStr);
		} else {
			const hasWildcard = config.fromPath.endsWith('/*')

			let url: string

			if (hasWildcard) {
				const contextPath = config.fromPath.replace('/*', '')
				const pathWithoutContext = req.path.replace(contextPath, '')

				url = urljoin(config.to, pathWithoutContext)
			} else {
				url = config.to
			}

			res.redirect(url + queryStr);
		}
	};
}

const getQueryString = (req: Request): string => {
	// @ts-ignore
	const query = unescape(stringify(req.query));
	return query ? `?${query}` : '';
}