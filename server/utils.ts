import { type TournamentType } from "@shared/schema";

/**
 * Calculate points based on position and tournament type
 * @param position - Finishing position (1-based)
 * @param tournamentType - Type of tournament ('major', 'tour', 'league', or 'supr')
 * @returns Points awarded for the position
 */
export function calculatePoints(position: number, tournamentType: TournamentType): number {
  // Majors: 1st=1000, 2nd=800, 3rd=650, 4th=520, 5th=400, 6th-10th=300 to 100 (decreasing by 50), 11th-20th=95 to 50 (decreasing by 5)
  // Tour: 1st=500, 2nd=400, 3rd=325, 4th=260, 5th=200, 6th-10th=150 to 50 (decreasing by 25), 11th-20th=48 to 25 (decreasing by 2.5)
  // League: 1st=250, 2nd=200, 3rd=160, 4th=130, 5th=100, 6th-10th=75 to 25 (decreasing by 12.5), 11th-20th=24 to 13 (decreasing by 1.25)
  // Supr: 1st=125, 2nd=100, 3rd=80, 4th=65, 5th=50, 6th-10th=38 to 13 (decreasing by 6.25), 11th-20th=12 to 6 (decreasing by 0.625)
  
  let points = 0;
  
  if (position <= 0) {
    return 0;
  }
  
  if (tournamentType === 'major') {
    if (position === 1) points = 1000;
    else if (position === 2) points = 800;
    else if (position === 3) points = 650;
    else if (position === 4) points = 520;
    else if (position === 5) points = 400;
    else if (position >= 6 && position <= 10) points = 300 - (position - 6) * 50;
    else if (position >= 11 && position <= 20) points = 95 - (position - 11) * 5;
    else points = 0; // No points for position > 20
  }
  else if (tournamentType === 'tour') {
    if (position === 1) points = 500;
    else if (position === 2) points = 400;
    else if (position === 3) points = 325;
    else if (position === 4) points = 260;
    else if (position === 5) points = 200;
    else if (position >= 6 && position <= 10) points = 150 - (position - 6) * 25;
    else if (position >= 11 && position <= 20) points = 48 - (position - 11) * 2.5;
    else points = 0;
  }
  else if (tournamentType === 'league') {
    if (position === 1) points = 250;
    else if (position === 2) points = 200;
    else if (position === 3) points = 160;
    else if (position === 4) points = 130;
    else if (position === 5) points = 100;
    else if (position >= 6 && position <= 10) points = 75 - (position - 6) * 12.5;
    else if (position >= 11 && position <= 20) points = 24 - (position - 11) * 1.25;
    else points = 0;
  }
  else if (tournamentType === 'supr') {
    if (position === 1) points = 125;
    else if (position === 2) points = 100;
    else if (position === 3) points = 80;
    else if (position === 4) points = 65;
    else if (position === 5) points = 50;
    else if (position >= 6 && position <= 10) points = 38 - (position - 6) * 6.25;
    else if (position >= 11 && position <= 20) points = 12 - (position - 11) * 0.625;
    else points = 0;
  }
  
  return Math.round(points);
}

/**
 * Calculate gross points based on gross position and tournament type
 * For gross scoring, use the tournament-specific points table based on tournament type
 * Note: This function should be used with the points config from database
 * @param position - Gross finishing position (1-based)
 * @param tournamentType - Type of tournament ('major', 'tour', 'league', or 'supr')
 * @param pointsConfig - Optional points configuration from database
 * @returns Gross points awarded for the position
 */
export function calculateGrossPoints(position: number, tournamentType: TournamentType = 'tour', pointsConfig?: any): number {
  if (position <= 0) return 0;
  
  // If points config is provided, use it for more accurate calculation
  if (pointsConfig && pointsConfig[tournamentType]) {
    const pointsTable = pointsConfig[tournamentType];
    const pointEntry = pointsTable.find((entry: any) => entry.position === position);
    return pointEntry ? pointEntry.points : 0;
  }
  
  // Fallback to hardcoded calculation (for backward compatibility)
  return calculatePoints(position, tournamentType);
}

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