export interface JsonData {
    [key: string]: any;
}

const substituteEnvVariables = (key: string, value: any): any => {
    if (typeof value !== "string") return value;
    const matches = value.match('{{(.*?)}}');
    if (!matches) return value;

    const valueFromEnv = process.env[matches[1]];
    if (!valueFromEnv) return value;
    return valueFromEnv;
}

export function parseJSONwithSubstitutions(text: string): JsonData {
    return JSON.parse(text, substituteEnvVariables);
}