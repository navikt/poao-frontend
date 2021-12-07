import { Request, Response } from 'express';

export function pingRoute() {
	return (req: Request, res: Response) => {
		res.send('');
	}
}
