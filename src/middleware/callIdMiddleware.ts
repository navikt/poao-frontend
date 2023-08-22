import {NextFunction, Request, Response} from "express";
import { v4 as uuidv4 } from 'uuid';


export const CALL_ID = "x_callId"
export const callIdMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
    const callId = req.headers[CALL_ID]
    if (!callId) {
        req.headers[CALL_ID] = uuidv4()
    }
    next()
}