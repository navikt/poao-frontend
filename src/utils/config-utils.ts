import { logger } from './logger.js';

/**
 * Safely coerces a string into a enum if the string is part of the enum's value set
 * @param enumType type to coerce string into
 * @param maybeEnumValue string to coerce
 */
export const toNullableEnumValue = <T extends { [k: string]: string }>(enumType: T, maybeEnumValue: string | undefined): T[keyof T] | undefined => {
    if (!maybeEnumValue) {
        return undefined
    }

    if (!Object.values(enumType).includes(maybeEnumValue)) {
        logger.warn(`'${maybeEnumValue}' is not an enum value`);
        return undefined;
    }

    return maybeEnumValue as T[keyof T]
}

export interface JsonData {
    [key: string]: any;
}

const substituteEnvVariables = (_key: string, value: any): any => {
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
