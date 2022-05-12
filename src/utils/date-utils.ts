export const getSecondsUntil = (epochMs: number): number => {
	const msUntil = epochMs - Date.now();

	if (msUntil < 0) {
		return 0;
	}

	return Math.ceil(msUntil / 1000);
};
