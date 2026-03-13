import { formatDatePtBr } from '../src/utils/quote-email-template.utils';

describe('quote-email-template.utils', () => {
  describe('formatDatePtBr', () => {
    it('should format date-only values in UTC to prevent day shift', () => {
      const result = formatDatePtBr('2026-04-01T00:00:00.000Z');
      expect(result).toBe('01/04/2026');
    });

    it('should return fallback for invalid date', () => {
      const result = formatDatePtBr('not-a-date');
      expect(result).toBe('-');
    });
  });
});
