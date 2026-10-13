import { createLogger, format, transports } from 'winston';
import * as fs from 'fs';// 5 Mb
createLogger({
    level: 'error',
    format: format.json(),
    transports: [new transports.Stream({
        silent: true,
        stream: fs.createWriteStream('/dev/null')
    })]
});

const maskedJsonFormat = format.printf((logEntry) => {
	const jsonLog = JSON.stringify({
		timestamp: new Date(),
		...logEntry,
	})

	// Masker fødselsnummer
	/*
	Avoid false positives on GUIDs.
	(?<!\w|-) Negative lookbehing - there is no word character [a-zA-Z0-9] or a minus sign before the 11 digits
	\d{11}     Eleven digits
	(?!\w|-)   Negative lookahead - there is no word character or a minus sign after the 11 digits.
	 */
	return jsonLog.replace(/(?<!\w|-)\d{11}(?!\w|-)/g, '<fnr>')
});

export function normalizePathParams(path: string): string {
	return path
		.replace(/((?<!\w|-)\d+(?!\w|-))/g, '<id>')  // numerid id in path
		.replace(/[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}/g, '<uuid>') // uuid in path
}

export const logger = createLogger({
	level: 'info',
	format: format.combine(
		format.splat(),
		maskedJsonFormat,
	),
	transports: [new transports.Console()]
});

export function registerProcessLogging() {
	process.on('warning', warning => {
		logger.warn(
			`Node warning: ${warning.name}: ${warning.message}`,
			{ warningName: warning.name, stack: warning.stack }
		);
	});

	process.on('uncaughtExceptionMonitor', error => {
		logger.error('Uncaught exception', { err: error });
	});

	process.on('unhandledRejection', reason => {
		logger.error('Unhandled promise rejection', { reason });
	});
}
