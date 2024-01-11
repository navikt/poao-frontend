export const assert = <T extends any>(value: T | undefined | null, msg?: string): T => {
	if (!value) {
		throw new Error(msg || 'Value is missing');
	}

	return value;
};
