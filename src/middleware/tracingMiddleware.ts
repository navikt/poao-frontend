import { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from 'uuid';

/* Express seems to lowercase all headers  */
export const CALL_ID = "nav-call-id"
export const CONSUMER_ID = "nav-consumer-id"

export const tracingMiddleware = (req: Request, _res: Response, next: NextFunction) => {
    const callId = req.headers[CALL_ID]
    if (!callId) {
        req.headers[CALL_ID] = uuidv4()
    }
    next()
}

