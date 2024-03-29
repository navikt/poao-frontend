import { createLogger, format, transports } from 'winston';
import * as fs from 'fs';

const MAX_LOG_FILES = 10
const MAX_LOG_SIZE = 1000 * 1000 * 5 // 5 Mb

const noOpLogger = createLogger({
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
	return jsonLog.replace(/\d{11}/g, '<fnr>')
});

export const logger = createLogger({
	level: 'info',
	format: maskedJsonFormat,
	transports: [new transports.Console()]
});

export let secureLog = noOpLogger

export const initSecureLog = () => {
	logger.info('Initializing secure log');

	secureLog = createLogger({
		level: 'info',
		format: format.json(),
		transports: [new transports.File({
			filename: 'secure.log',
			dirname: '/secure-logs',
			maxFiles: MAX_LOG_FILES,
			maxsize: MAX_LOG_SIZE
		})]
	});
}
