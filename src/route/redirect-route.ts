import { Request, Response } from 'express';
import urljoin from "url-join";
import {stringify, unescape} from "querystring";

export interface RedirectRouterConfig {
	to: string;
	preserveContextPath?: boolean
}

export function redirectRoute(config: RedirectRouterConfig) {
	return (req: Request, res: Response) => {
		if (config.preserveContextPath) {
			// @ts-ignore
			let query = unescape(stringify(req.query));
			query = !!query ? '?' + query : '';
			const url = urljoin(config.to, req.path) + query;
			res.redirect(url);
		} else {
			res.redirect(config.to);
		}
	};
}