import { SCORING_TYPES } from './constants';

interface SampleRow {
  [key: string]: string | number;
}

/**
 * Generate sample spreadsheet data based on tournament type and scoring mode
 */
export function generateSampleSpreadsheet(
  scoringMode: 'calculated' | 'manual',
  scoringType: 'net' | 'gross' | 'both' = 'both',
): { headers: string[]; rows: SampleRow[] } {
  const baseHeaders = ['Player Name', 'Position'];
  let headers: string[] = [...baseHeaders];

  // Add scoring-specific headers
  if (scoringMode === 'calculated') {
    if (scoringType === 'net' || scoringType === 'both') {
      headers.push('Net Score', 'Handicap');
    }
    if (scoringType === 'gross' || scoringType === 'both') {
      headers.push('Gross Score');
    }
  } else {
    // Manual mode always includes points
    headers.push('Points');
    if (scoringType === 'net' || scoringType === 'both') {
      headers.push('Net Score', 'Handicap');
    }
    if (scoringType === 'gross' || scoringType === 'both') {
      headers.push('Gross Score');
    }
  }

  // Generate sample data
  const samplePlayers = [
    'John Smith',
    'Jane Doe',
    'Mike Johnson',
    'Sarah Wilson',
    'David Brown',
    'Lisa Davis',
    'Chris Miller',
    'Amanda Garcia',
    'Tom Anderson',
    'Emily Taylor',
  ];

  const rows: SampleRow[] = samplePlayers.map((player, index) => {
    const position = index + 1;
    const row: SampleRow = {
      'Player Name': player,
      Position: position,
    };

    if (scoringMode === 'calculated') {
      // Generate realistic scores for calculated tournaments
      if (scoringType === 'net' || scoringType === 'both') {
        row['Net Score'] = 68 + index * 2; // Progressive net scores
        row['Handicap'] = Math.max(0, 18 - index * 2); // Decreasing handicaps
      }
      if (scoringType === 'gross' || scoringType === 'both') {
        const handicap = Number(row['Handicap'] || 0);
        const netScore = Number(row['Net Score'] || 70);
        row['Gross Score'] = netScore + handicap;
      }
    } else {
      // Manual mode with direct points
      const majorPoints = [750, 400, 350, 300, 250, 200, 175, 150, 125, 100];
      row['Points'] = majorPoints[index] || Math.max(0, 100 - index * 10);

      // Optional scores for manual tournaments
      if (scoringType === 'net' || scoringType === 'both') {
        row['Net Score'] = 68 + index * 2;
        row['Handicap'] = Math.max(0, 18 - index * 2);
      }
      if (scoringType === 'gross' || scoringType === 'both') {
        const handicap = Number(row['Handicap'] || 0);
        const netScore = Number(row['Net Score'] || 70);
        row['Gross Score'] = netScore + handicap;
      }
    }

    return row;
  });

  return { headers, rows };
}

/**
 * Convert sample data to CSV format
 */
export function generateSampleCSV(
  scoringMode: 'calculated' | 'manual',
  scoringType: 'net' | 'gross' | 'both' = 'both',
): string {
  const { headers, rows } = generateSampleSpreadsheet(scoringMode, scoringType);

  const csvHeaders = headers.join(',');
  const csvRows = rows.map((row) => headers.map((header) => row[header] || '').join(','));

  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Download sample CSV file
 */
export function downloadSampleSpreadsheet(
  scoringMode: 'calculated' | 'manual',
  scoringType: 'net' | 'gross' | 'both' = 'both',
  tournamentType: string = 'tour',
) {
  const csv = generateSampleCSV(scoringMode, scoringType);
  const filename = `sample_${tournamentType}_${scoringMode}_${scoringType}.csv`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Get required fields based on scoring configuration
 */
export function getRequiredFields(
  scoringMode: 'calculated' | 'manual',
  scoringType: 'net' | 'gross' | 'both' = 'both',
): string[] {
  const baseFields = ['Player Name', 'Position'];

  if (scoringMode === 'manual') {
    baseFields.push('Points');
  }

  if (scoringType === 'net' || scoringType === 'both') {
    baseFields.push('Net Score', 'Handicap');
  }

  if (scoringType === 'gross' || scoringType === 'both') {
    baseFields.push('Gross Score');
  }

  return baseFields;
}

/**
 * Get field descriptions for help text
 */
export function getFieldDescriptions(scoringMode: 'calculated' | 'manual'): Record<string, string> {
  const descriptions: Record<string, string> = {
    'Player Name': 'Full name of the player',
    Position: 'Final finishing position (1st, 2nd, etc.)',
  };

  if (scoringMode === 'manual') {
    descriptions['Points'] = 'Points to award for this position';
  }

  descriptions['Net Score'] = 'Net score (gross score minus handicap)';
  descriptions['Gross Score'] = 'Gross score (actual strokes played)';
  descriptions['Handicap'] = 'Player handicap for this tournament';

  return descriptions;
}
