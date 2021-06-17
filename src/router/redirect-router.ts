import { Request, Response } from 'express';

export interface RedirectRouterConfig {
	to: string;
}

export function redirectRouter(config: RedirectRouterConfig) {
	return (req: Request, res: Response) => {
		res.redirect(config.to);
	};
}