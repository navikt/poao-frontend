import { existsSync, readFileSync } from 'fs';

export interface Config {
	proxies?: ProxyConfig[]
}

export interface ProxyConfig {
	from: string; // Must be a relative path
	to: string;
	preserveContextPath?: boolean;
}

export function readConfigFile(configFilePath: string): Config {
	if (!existsSync(configFilePath)) return {};

	const configStr = readFileSync(configFilePath).toString();

	return JSON.parse(configStr);
}

export function validateConfig(config: Config) {
	if (config.proxies) {
		config.proxies.forEach(proxy => {
			if (!proxy.from) {
				throw new Error(`The field 'from' is missing from: ${JSON.stringify(proxy)}`);
			}

			if (!proxy.to) {
				throw new Error(`The field 'to' is missing from: ${JSON.stringify(proxy)}`);
			}

			if (!proxy.from.startsWith("/")) {
				throw new Error(`'${proxy.from}' is not a relative path starting with '/'`);
			}

			if (proxy.from.startsWith("/internal")) {
				throw new Error(`'${proxy.from}' cannot start with '/internal'`);
			}
		})
	}
}