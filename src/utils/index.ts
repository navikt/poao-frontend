export const assert = <T extends any>(value: T | undefined | null, msg?: string): T => {
	if (!value) {
		throw new Error(msg || 'Value is missing');
	}

	return value;
};

export const csvStrToStrArray = (str: string | undefined): string[] => {
	if (!str) {
		return [];
	}

	return str.split(',').map((v) => v.trim());
};

/**
 * Safely coerces a string into a enum if the string is part of the enum's value set
 * @param str string to coerce
 * @param enumType type to coerce string into
 */
export const strToEnum = <T extends { [key: string]: string }>(
	str: string | undefined,
	enumType: T
): undefined | T[keyof T] => {
	if (str && Object.values(enumType).includes(str)) {
		return str as T[keyof T];
	}

	return undefined;
};
