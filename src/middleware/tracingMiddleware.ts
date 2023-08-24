import {NextFunction, Request, Response} from "express";
import { v4 as uuidv4 } from 'uuid';
import {logger} from "../utils/logger";

/* Express seems to lowercase all headers  */
export const CALL_ID = "nav-call-id"
export const CONSUMER_ID = "nav-consumer-id"

const assetFileEnding = [".ico", ".map", ".js", ".css", ".html"]
const assetRequest = (req: Request) => {
    if (req.path === "/") return true
    return assetFileEnding
        .some(fileEnding => req.path.endsWith(fileEnding))
}
export const tracingMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const callId = req.headers[CALL_ID]
    if (!callId) {
        req.headers[CALL_ID] = uuidv4()
    }
    const consumerId = req.headers[CONSUMER_ID]
    if (!consumerId && !assetRequest(req)) {
        logger.warn({
            message: "Request tracing missing: " + JSON.stringify([!callId ? "callId": undefined, !consumerId ? "consumerId": undefined].filter(it => it)),
            callId: req.headers[CALL_ID],
            consumerId: req.headers[CONSUMER_ID],
            path: req.path?.replace(/\d{11}/g, '<fnr>'),
            origin: req.headers["origin"],
            referer: req.headers["referer"]?.replace(/\d{11}/g, '<fnr>')
        })
    }
    next()
}
