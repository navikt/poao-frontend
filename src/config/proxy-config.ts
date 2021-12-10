import { logger } from '../utils/logger';
import { JsonData } from '../utils/json-utils';

export interface ProxyConfig {
	proxies: Proxy[];
}

export interface Proxy {
	fromPath: string; // Must be a relative path
	toUrl: string;
	toApp: ProxyApp;
	preserveFromPath: boolean; // If true, 'fromPath' will be prepended to the request path before sending to 'toUrl'
}

export interface ProxyApp {
	name: string;
	namespace: string;
	cluster: string;
}

const DEFAULT_PRESERVE_FROM_PATH = false;

export const logProxyConfig = (proxyConfig: ProxyConfig): void => {
	proxyConfig.proxies.forEach((proxy) => {
		const { fromPath, toUrl, toApp, preserveFromPath } = proxy;
		const appId = `${toApp.cluster}.${toApp.namespace}.${toApp.name}`;

		logger.info(
			`Proxy config entry: fromPath=${fromPath} toUrl=${toUrl} app=${appId} preserveFromPath=${preserveFromPath}`
		);
	});
};

export const resolveProxyConfig = (jsonData: JsonData | undefined): ProxyConfig => {
	if (!jsonData) {
		return { proxies: [] };
	}

	const partialProxies = jsonData as Partial<Proxy>[];

	const proxies = partialProxies.map(p => validateProxy(addDefaultValues(p)));

	return { proxies };
};

const addDefaultValues = (partialProxy: Partial<Proxy>): Partial<Proxy> => {
	if (partialProxy.preserveFromPath == null) {
		partialProxy.preserveFromPath = DEFAULT_PRESERVE_FROM_PATH;
	}

	return partialProxy
}

const validateProxy = (proxy: Partial<Proxy>): Proxy => {
	if (!proxy.fromPath) {
		throw new Error(`The field 'fromPath' is missing`);
	}

	if (!proxy.fromPath.startsWith('/')) {
		throw new Error(`'${proxy.fromPath}' is not a relative path starting with '/'`);
	}

	if (proxy.fromPath.startsWith('/internal')) {
		throw new Error(`'${proxy.fromPath}' cannot start with '/internal'`);
	}

	if (!proxy.toUrl) {
		throw new Error(`The field 'toUrl' is missing from`);
	}

	if (!proxy.toApp) {
		throw new Error(`The field 'toApp' is missing from`);
	}

	if (!proxy.toApp.name) {
		throw new Error(`The field 'toApp.name' is missing from`);
	}

	if (!proxy.toApp.namespace) {
		throw new Error(`The field 'toApp.namespace' is missing from`);
	}

	if (!proxy.toApp.cluster) {
		throw new Error(`The field 'toApp.cluster' is missing from`);
	}

	return proxy as Proxy;
};
