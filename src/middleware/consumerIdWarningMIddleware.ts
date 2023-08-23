import {NextFunction, Request, Response} from "express";
import { v4 as uuidv4 } from 'uuid';
import {APP_NAME} from "../config/base-config";
import {logger} from "../utils/logger";
import {CALL_ID} from "./callIdMiddleware";

export const CONSUMER_ID = "nav-consumer-id"
export const consumerIdWarningMiddleware = (req: Request, res: Response, next: NextFunction) => {
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
    next()
}
