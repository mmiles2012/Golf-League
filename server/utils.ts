/**
 * Legacy function for backward compatibility - uses Tour points table
 * @deprecated Use calculateGrossPoints(position, tournamentType) instead
 * @param position - Gross finishing position (1-based)
 * @returns Gross points awarded for the position using Tour table
 */
export function calculateGrossPointsLegacy(position: number): number {
  const tourPoints = [
    500, 300, 190, 135, 110, 100, 90, 85, 80, 75,    // 1-10
    70, 65, 60, 55, 53, 51, 49, 47, 45, 43,          // 11-20
    41, 39, 37, 35.5, 34, 32.5, 31, 29.5, 28, 26.5, // 21-30
    25, 23.5, 22, 21, 20, 19, 18, 17, 16, 15,        // 31-40
    14, 13, 12, 11, 10.5, 10, 9.5, 9, 8.5, 8,       // 41-50
  ];
  
  if (position <= 0) return 0;
  
  return position <= 50 ? tourPoints[position - 1] : 
         position <= 51 ? 7.5 :
         position <= 52 ? 7 :
         position <= 53 ? 6.5 :
         position <= 54 ? 6 :
         position <= 55 ? 5.8 :
         position <= 56 ? 5.6 :
         position <= 57 ? 5.4 :
         position <= 58 ? 5.2 :
         position <= 59 ? 5 :
         position <= 60 ? 4.8 :
         position <= 61 ? 4.6 :
         position <= 62 ? 4.4 :
         position <= 63 ? 4.2 :
         position <= 64 ? 4 : 3.8;
}