import winston from 'winston';
import * as fs from 'fs';

const MAX_LOG_FILES = 10
const MAX_LOG_SIZE = 1000 * 1000 * 5 // 5 Mb

const noOpLogger = winston.createLogger({
	level: 'error',
	format: winston.format.json(),
	transports: [new winston.transports.Stream({
		silent: true,
		stream: fs.createWriteStream('/dev/null')
	})]
});

const maskedJsonFormat = winston.format.printf( (logEntry) => {
	const jsonLog = JSON.stringify({
		timestamp: new Date(),
		...logEntry,
	})

	// Masker fødselsnummer
	return jsonLog.replace(/\d{11}/g, '<fnr>')
});

export const logger = winston.createLogger({
	level: 'info',
	format: maskedJsonFormat,
	transports: [new winston.transports.Console()]
});

export let secureLog = noOpLogger

export const initSecureLog = () => {
	logger.info('Initializing secure log');

	secureLog = winston.createLogger({
		level: 'info',
		format: winston.format.json(),
		transports: [new winston.transports.File({
			filename: 'secure.log',
			dirname: '/secure-logs',
			maxFiles: MAX_LOG_FILES,
			maxsize: MAX_LOG_SIZE
		})]
	});
}
