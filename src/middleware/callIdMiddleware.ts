import {NextFunction, Request, Response} from "express";
import { v4 as uuidv4 } from 'uuid';
import {APP_NAME} from "../config/base-config";

/* Express seems to lowercase all headers  */
export const CALL_ID = "x_callid"
export const REQUEST_ID = "x_requestid"
export const callIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const callId = req.headers[CALL_ID] || req.headers[REQUEST_ID]
    if (!callId) {
        req.headers[CALL_ID] = uuidv4()
    }
    next()
}
