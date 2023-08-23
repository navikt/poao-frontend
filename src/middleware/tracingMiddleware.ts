import {NextFunction, Request, Response} from "express";
import { v4 as uuidv4 } from 'uuid';
import {logger} from "../utils/logger";

/* Express seems to lowercase all headers  */
export const CALL_ID = "nav-call-id"
export const CONSUMER_ID = "nav-consumer-id"
export const tracingMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const consumerId = req.headers[CONSUMER_ID]
    if (!consumerId) {
        logger.warn({
            message: "Request missing consumerId",
            callId: req.headers[CALL_ID],
            consumerId: req.headers[CONSUMER_ID],
            origin: req.headers["origin"],
            referer: req.headers["referer"]?.replace(/\d{11}/g, '<fnr>')
        })
    }
    const callId = req.headers[CALL_ID]
    if (!callId) {
        req.headers[CALL_ID] = uuidv4()
    }
    next()
}
