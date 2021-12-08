import { createEnvJsContent, getPrefixedEnvVars } from './frontend-env-route';

describe('getPrefixedEnvVars', () => {
	it('should get prefixed env vars', () => {
		const env = {
			'PUBLIC_VAR_1': 'value1',
			'VAR_2': 'value2',
			'PUBLIC_VAR_3': 'value3',
			'PUBLIC_VAR_4': undefined
		};

		const expectedEnv = [
			{
				name: 'PUBLIC_VAR_1',
				value: 'value1'
			},
			{
				name: 'PUBLIC_VAR_3',
				value: 'value3'
			}
		];

		expect(getPrefixedEnvVars('PUBLIC', env)).toStrictEqual(expectedEnv);
	})
});

describe('createEnvJsContent', () => {
	it('should create correct env.js content', () => {
		const env = {
			'PUBLIC_VAR_1': 'value1',
			'VAR_2': 'value2',
			'PUBLIC_VAR_3': 'value3',
			'PUBLIC_VAR_4': undefined
		};

		const expectedEnvJsContent = "window.env = {_VAR_1: 'value1', _VAR_3: 'value3'};";

		expect(createEnvJsContent('PUBLIC', env)).toBe(expectedEnvJsContent);
	})
});
