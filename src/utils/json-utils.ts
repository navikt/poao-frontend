
const substituteEnvVariables = (key: string, value: any): any => {
    if (typeof value !== "string") return value;
    const matches = value.match('{{(.*?)}}');
    if (!matches) return value;

    const valueFromEnv = process.env[matches[1]];
    if (!valueFromEnv) return value;
    return valueFromEnv;
}

export function parseJSONwithSubstitutions(text: string): any {
    return JSON.parse(text, substituteEnvVariables);
}