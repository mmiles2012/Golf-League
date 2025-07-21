// NOTE: This file tests handicap calculation logic for both net and gross scores.
// Authentication and permissions are handled by Replit OAuth and backend roles, not tested here.

describe('Handicap and Score Calculations', () => {
  // Net Score = Gross Score - Handicap
  function calculateNetScore(gross: number, handicap: number): number {
    return gross - handicap;
  }

  // Gross Score = Net Score + Handicap
  function calculateGrossScore(net: number, handicap: number): number {
    return net + handicap;
  }

  describe('Net Score Calculations', () => {
    it('calculates net score with positive handicap', () => {
      expect(calculateNetScore(90, 10)).toBe(80);
    });

    it('calculates net score with zero handicap', () => {
      expect(calculateNetScore(85, 0)).toBe(85);
    });

    it('calculates net score with negative handicap (scratch+ player)', () => {
      expect(calculateNetScore(80, -2)).toBe(82);
    });

    it('handles decimal handicaps', () => {
      expect(calculateNetScore(95, 7.5)).toBe(87.5);
    });
  });

  describe('Gross Score Calculations', () => {
    it('calculates gross score with positive handicap', () => {
      expect(calculateGrossScore(80, 10)).toBe(90);
    });

    it('calculates gross score with zero handicap', () => {
      expect(calculateGrossScore(75, 0)).toBe(75);
    });

    it('calculates gross score with negative handicap (scratch+ player)', () => {
      // For players better than scratch, gross score should be lower than net
      expect(calculateGrossScore(72, -2)).toBe(70);
    });

    it('handles decimal negative handicaps', () => {
      expect(calculateGrossScore(74, -1.5)).toBe(72.5);
    });
  });

  describe('Bidirectional Score Conversion', () => {
    it('converts between net and gross scores correctly for positive handicap', () => {
      const grossScore = 90;
      const handicap = 10;
      const netScore = calculateNetScore(grossScore, handicap);
      const backToGross = calculateGrossScore(netScore, handicap);

      expect(netScore).toBe(80);
      expect(backToGross).toBe(grossScore);
    });

    it('converts between net and gross scores correctly for negative handicap', () => {
      const netScore = 72;
      const handicap = -2;
      const grossScore = calculateGrossScore(netScore, handicap);
      const backToNet = calculateNetScore(grossScore, handicap);

      expect(grossScore).toBe(70);
      expect(backToNet).toBe(netScore);
    });
  });
});

// NOTE: All table layouts now use Tailwind utility classes. Do not expect custom CSS classes for tables in DOM tests.
