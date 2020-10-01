import fs from 'fs';
import path from 'path';

const envJsStr = 'window.env = {?};';
const envOutputFile = 'env.js';
const publicEnvPrefix = 'PUBLIC_';

export function createEnvJsFile(outputDir: string): void {
	const publicEnvVars = getPrefixedEnvVars(publicEnvPrefix);

	const envVarStr = publicEnvVars.map(envVar => {
		const strippedKey = envVar.name.replace(publicEnvPrefix, '');
		const safeValue = envVar.value.replace(new RegExp("'", 'g'), "\\'");

		return `${strippedKey}: '${safeValue}'`;
	}).join(', ');

	fs.mkdirSync(outputDir, { recursive: true });
	fs.writeFileSync(path.join(outputDir, envOutputFile), envJsStr.replace('?', envVarStr));
}

function getPrefixedEnvVars(prefix: string): EnvVar[] {
	return Object.entries(process.env).filter(([name, value]) => {
		return name.startsWith(prefix) && value;
	}).map(([name, value]) => {
		return {
			name: name as string,
			value: value as string
		};
	});
}

interface EnvVar {
	name: string;
	value: string;
}
