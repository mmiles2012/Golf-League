// Define tournament types with labels for UI components
export const TOURNAMENT_TYPES = [
  { value: 'major', label: 'Major Event' },
  { value: 'tour', label: 'Tour Event' },
  { value: 'league', label: 'League Event' },
  { value: 'supr', label: 'SUPR Club Event' },
  { value: 'manual', label: 'Manual Tournament' }
];

// Define scoring modes
export const SCORING_MODES = [
  { value: 'calculated', label: 'Calculated Points', description: 'System calculates points based on positions and scores' },
  { value: 'manual', label: 'Manual Points', description: 'Admin directly assigns points to players' }
];

// Define scoring types for calculated tournaments
export const SCORING_TYPES = [
  { value: 'net', label: 'Net Scoring Only', fields: ['position', 'netScore', 'handicap'] },
  { value: 'gross', label: 'Gross Scoring Only', fields: ['position', 'grossScore'] },
  { value: 'both', label: 'Both Net and Gross', fields: ['position', 'netScore', 'grossScore', 'handicap'] }
];

// Define tournament status options
export const TOURNAMENT_STATUS = [
  { value: 'completed', label: 'Completed' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'upcoming', label: 'Upcoming' }
];

// Maximum file size for uploads (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Supported file formats for tournament uploads
export const SUPPORTED_FILE_FORMATS = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv', // .csv
  'application/csv' // .csv alternative MIME type
];

// File extensions for display
export const SUPPORTED_FILE_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

// Sample data structure for tournament results upload - calculated tournaments
export const SAMPLE_CALCULATED_TOURNAMENT_STRUCTURE = {
  "Player Name": "John Doe",
  "Position": "1", 
  "Gross Score": "72",
  "Net Score": "68",
  "Course Handicap": "4"
};

// Sample data structure for tournament results upload - manual tournaments
export const SAMPLE_MANUAL_TOURNAMENT_STRUCTURE = {
  "Player Name": "John Doe",
  "Position": "1",
  "Points": "100",
  "Gross Score": "72", // Optional
  "Net Score": "68", // Optional
  "Course Handicap": "4" // Optional
};

// Number of players to show per page in tables
export const PLAYERS_PER_PAGE = 20;

// Number of tournaments to show per page in tables
export const TOURNAMENTS_PER_PAGE = 10;

// Number of top players to display on dashboard
export const TOP_PLAYERS_COUNT = 5;

// Number of recent tournaments to display on dashboard
export const RECENT_TOURNAMENTS_COUNT = 3;

// Application name for titles and SEO
export const APP_NAME = "Hideout Golf League Tracker";

// Default document title
export const DEFAULT_TITLE = `${APP_NAME} - Professional Golf League Scoreboard`;

// Base URL for API endpoints
export const API_BASE_URL = "/api";

// Debounce delay for search inputs (in milliseconds)
export const SEARCH_DEBOUNCE_DELAY = 300;
