import { hoursToMs } from './utils';

describe('hoursToMs', () => {
	it('should convert hours to milliseconds', () => {
		expect(hoursToMs(1)).toBe(3600000);
	})
});
