
import { AlertTriangle, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export interface UploadError {
  type: 'validation' | 'format' | 'data' | 'server';
  message: string;
  details?: string[];
  field?: string;
  row?: number;
}

interface UploadErrorHandlerProps {
  errors: UploadError[];
  onDismiss: () => void;
  onRetry?: () => void;
}

export default function UploadErrorHandler({ errors, onDismiss, onRetry }: UploadErrorHandlerProps) {
  if (errors.length === 0) return null;

  const formatErrors = errors.filter(e => e.type === 'format');
  const validationErrors = errors.filter(e => e.type === 'validation');
  const dataErrors = errors.filter(e => e.type === 'data');
  const serverErrors = errors.filter(e => e.type === 'server');

  return (
    <div className="space-y-4">
      {/* Format Errors */}
      {formatErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium mb-2">File Format Issues</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {formatErrors.map((error, index) => (
                    <li key={index}>{error.message}</li>
                  ))}
                </ul>
                <div className="mt-3 p-3 bg-red-50 rounded-md">
                  <p className="text-sm font-medium text-red-800">Required Excel columns:</p>
                  <ul className="text-xs text-red-700 mt-1 space-y-1">
                    <li>• <strong>Player</strong> - Full name (e.g., "John Smith")</li>
                    <li>• <strong>Position</strong> - Finishing position (1, 2, 3, etc.)</li>
                    <li>• <strong>Scoring</strong> - "StrokeNet" or "Stroke"</li>
                    <li>• <strong>Total</strong> - Score value</li>
                    <li>• <strong>Course Handicap</strong> - Player's handicap</li>
                  </ul>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Data Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium mb-2">Data Validation Errors</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {validationErrors.map((error, index) => (
                    <li key={index}>
                      {error.row && <span className="font-medium">Row {error.row}:</span>} {error.message}
                      {error.field && <span className="text-red-600"> (Field: {error.field})</span>}
                    </li>
                  ))}
                </ul>
              </div>
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Data Quality Errors */}
      {dataErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium mb-2">Data Quality Issues</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {dataErrors.map((error, index) => (
                    <li key={index}>
                      {error.row && <span className="font-medium">Row {error.row}:</span>} {error.message}
                    </li>
                  ))}
                </ul>
              </div>
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Server Errors */}
      {serverErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium mb-2">Server Error</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {serverErrors.map((error, index) => (
                    <li key={index}>{error.message}</li>
                  ))}
                </ul>
                {onRetry && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={onRetry}
                  >
                    Retry Upload
                  </Button>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// Validation utility functions
export const validateTournamentFile = (data: any[]): UploadError[] => {
  const errors: UploadError[] = [];
  
  if (!data || data.length === 0) {
    errors.push({
      type: 'format',
      message: 'Excel file is empty or could not be read'
    });
    return errors;
  }

  // Check required columns
  const firstRow = data[0];
  const requiredColumns = ['Player', 'Position', 'Total'];
  const availableColumns = Object.keys(firstRow);
  
  const missingColumns = requiredColumns.filter(col => 
    !availableColumns.some(available => 
      available.toLowerCase().includes(col.toLowerCase()) ||
      col.toLowerCase().includes(available.toLowerCase())
    )
  );

  if (missingColumns.length > 0) {
    errors.push({
      type: 'format',
      message: `Missing required columns: ${missingColumns.join(', ')}`
    });
  }

  // Validate each row
  data.forEach((row, index) => {
    const rowNumber = index + 1;
    
    // Check player name
    const playerName = row.Player || row["Player Name"] || row.player || row.Name || row.name;
    if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
      errors.push({
        type: 'validation',
        message: 'Player name is required and must be a non-empty string',
        row: rowNumber,
        field: 'Player'
      });
    }

    // Check position
    const position = row.Position || row.Pos || row.position;
    if (position === undefined || position === null) {
      errors.push({
        type: 'validation',
        message: 'Position is required',
        row: rowNumber,
        field: 'Position'
      });
    } else {
      const positionNum = Number(position);
      if (isNaN(positionNum) || positionNum < 1 || !Number.isInteger(positionNum)) {
        errors.push({
          type: 'validation',
          message: 'Position must be a positive integer',
          row: rowNumber,
          field: 'Position'
        });
      }
    }

    // Check total score
    const total = row.Total || row.total;
    if (total === undefined || total === null) {
      errors.push({
        type: 'validation',
        message: 'Total score is required',
        row: rowNumber,
        field: 'Total'
      });
    } else {
      const totalNum = Number(total);
      if (isNaN(totalNum)) {
        errors.push({
          type: 'validation',
          message: 'Total score must be a valid number',
          row: rowNumber,
          field: 'Total'
        });
      }
    }

    // Check handicap if present
    const handicap = row["Course Handicap"] || row["Playing Handicap"] || row.handicap || row.Handicap;
    if (handicap !== undefined && handicap !== null) {
      const handicapStr = String(handicap);
      const handicapNum = Number(handicapStr.replace('+', ''));
      if (isNaN(handicapNum)) {
        errors.push({
          type: 'validation',
          message: 'Handicap must be a valid number (can include + prefix)',
          row: rowNumber,
          field: 'Handicap'
        });
      }
    }
  });

  // Check for duplicate positions
  const positions = data.map((row, index) => ({
    position: Number(row.Position || row.Pos || row.position),
    row: index + 1
  })).filter(p => !isNaN(p.position));

  const positionCounts = positions.reduce((acc, curr) => {
    acc[curr.position] = (acc[curr.position] || []).concat(curr.row);
    return acc;
  }, {} as Record<number, number[]>);

  Object.entries(positionCounts).forEach(([position, rows]) => {
    if (rows.length > 1) {
      errors.push({
        type: 'data',
        message: `Duplicate position ${position} found in rows: ${rows.join(', ')}`
      });
    }
  });

  return errors;
};
