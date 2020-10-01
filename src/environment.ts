const DEFAULT_PORT = 8080;
const DEFAULT_PUBLIC_PATH = '/public';
const DEFAULT_CONTEXT_PATH = '';
const DEFAULT_REDIRECT_ON_NOT_FOUND = 'true';

class Environment {

	get port(): number {
		const portFromEnv = process.env.PORT;
		const port = portFromEnv ? parseInt(portFromEnv) : NaN;
		return isNaN(port) ? DEFAULT_PORT : port;
	}

	get publicPath(): string {
		return process.env.PUBLIC_PATH || DEFAULT_PUBLIC_PATH;
	}

	get contextPath(): string {
		return process.env.CONTEXT_PATH || DEFAULT_CONTEXT_PATH;
	}

	get redirectOnNotFound(): boolean {
		const redirectOnNotFound = process.env.REDIRECT_ON_NOT_FOUND || DEFAULT_REDIRECT_ON_NOT_FOUND;
		return redirectOnNotFound === 'true';
	}

	get navDekoratorUrl(): string | undefined {
		return process.env.NAV_DEKORATOR_URL;
	}

}

const environment = new Environment();

export default environment;
