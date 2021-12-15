import { logger } from './logger';

export const assert = <T extends any>(value: T | undefined | null, msg?: string): T => {
	if (!value) {
		throw new Error(msg || 'Value is missing');
	}

	return value;
};

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
