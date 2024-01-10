import { Request, Response } from 'express';

export function pingRoute() {
	return (_req: Request, res: Response) => {
		res.sendStatus(200);
	}
}
