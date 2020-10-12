import fs from 'fs';
import path from 'path';

const ENV_FILE_NAME = 'env.js';
const PUBLIC_ENV_PREFIX = 'PUBLIC_';

export function createEnvJsFile(outputDir: string): void {
	const envJsFilePath = path.join(outputDir, ENV_FILE_NAME);
	const envJsFileContent = createEnvJsContent(PUBLIC_ENV_PREFIX, process.env);

	fs.mkdirSync(outputDir, { recursive: true });
	fs.writeFileSync(envJsFilePath, envJsFileContent);
}

export function createEnvJsContent(publicEnvPrefix: string, env: ProcessEnv): string {
	const publicEnvVars = getPrefixedEnvVars(publicEnvPrefix, env);

	const envVarStr = publicEnvVars.map(envVar => {
		const strippedKey = envVar.name.replace(publicEnvPrefix, '');
		const safeValue = envVar.value.replace(new RegExp("'", 'g'), "\\'");

		return `${strippedKey}: '${safeValue}'`;
	}).join(', ');

	return `window.env = {${envVarStr}};`
}

export function getPrefixedEnvVars(prefix: string, env: ProcessEnv): EnvVar[] {
	return Object.entries(env).filter(([name, value]) => {
		return typeof name === 'string' && name.startsWith(prefix) && value;
	}).map(([name, value]) => {
		return {
			name: name as string,
			value: value as string
		};
	});
}

interface ProcessEnv {
	[key: string]: string | undefined
}

interface EnvVar {
	name: string;
	value: string;
}
