import { logger } from '../utils/logger';
import { JsonData } from '../utils/json-utils';

export interface ProxyConfig {
	proxies: Proxy[];
}

export interface Proxy {
	fromPath: string;
	toUrl: string;
	toApp: ProxyApp;
	preserveFromPath?: boolean; // If true, 'fromPath' will be prepended to the request path before sending to 'toUrl'
}

export interface ProxyApp {
	name: string;
	namespace: string;
	cluster: string;
}

export const logProxyConfig = (proxyConfig: ProxyConfig): void => {
	proxyConfig.proxies.forEach((proxy) => {
		const { fromPath, toUrl, toApp, preserveFromPath } = proxy;
		const appId = `${toApp.cluster}.${toApp.namespace}.${toApp.name}`;

		logger.info(
			`Proxy config entry: fromPath=${fromPath} toUrl=${toUrl} app=${appId} preserveContextPath=${preserveFromPath}`
		);
	});
};

export const resolveProxyConfig = (jsonData: JsonData | undefined): ProxyConfig => {
	if (!jsonData) {
		return { proxies: [] };
	}

	const config = resolveProxyConfigFromJson(jsonData);

	if (!config.proxies) {
		config.proxies = [];
	}

	validateProxyConfig(config);

	return config as ProxyConfig;
};

const resolveProxyConfigFromJson = (jsonConfig: JsonData | undefined): Partial<ProxyConfig> => {
	if (!jsonConfig?.proxy) return {};
	return jsonConfig.proxy;
};

const validateProxyConfig = (config: Partial<ProxyConfig>): void => {
	if (!config.proxies || config.proxies.length === 0) {
		return;
	}

	config.proxies.forEach((proxy) => {
		const proxyJson = JSON.stringify(proxy);

		if (!proxy.fromPath) {
			throw new Error(`The field 'fromPath' is missing from: ${proxyJson}`);
		}

		if (!proxy.fromPath.startsWith('/')) {
			throw new Error(`'${proxy.fromPath}' is not a relative path starting with '/'`);
		}

		if (proxy.fromPath.startsWith('/internal')) {
			throw new Error(`'${proxy.fromPath}' cannot start with '/internal'`);
		}

		if (!proxy.toUrl) {
			throw new Error(`The field 'toUrl' is missing from: ${proxyJson}`);
		}

		if (!proxy.toApp) {
			throw new Error(`The field 'toApp' is missing from: ${proxyJson}`);
		}

		if (!proxy.toApp.name) {
			throw new Error(`The field 'toApp.name' is missing from: ${proxyJson}`);
		}

		if (!proxy.toApp.namespace) {
			throw new Error(`The field 'toApp.namespace' is missing from: ${proxyJson}`);
		}

		if (!proxy.toApp.cluster) {
			throw new Error(`The field 'toApp.cluster' is missing from: ${proxyJson}`);
		}
	});
};
