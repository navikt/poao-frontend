import { logger } from '../utils/logger';
import { JsonConfig } from './app-config-resolver';

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

export const resolveProxyConfig = (proxiesJsonConfig: JsonConfig.Proxy[] | undefined): ProxyConfig => {
	if (!proxiesJsonConfig) {
		return { proxies: [] };
	}

	const proxies = proxiesJsonConfig.map(p => validateProxy(toPartialProxy(p)));

	return { proxies };
};

const toPartialProxy = (proxy: JsonConfig.Proxy): Partial<Proxy> => {
	const partialProxy: Partial<Proxy> = {
		fromPath: proxy.fromPath,
		toUrl: proxy.toUrl,
		preserveFromPath: proxy.preserveFromPath,
		toApp: {
			name: proxy.toApp?.name || '',
			cluster: proxy.toApp?.cluster || '',
			namespace: proxy.toApp?.namespace || '',
		}
	};

	if (proxy.preserveFromPath == null) {
		proxy.preserveFromPath = DEFAULT_PRESERVE_FROM_PATH;
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
