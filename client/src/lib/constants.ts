// Define tournament types with labels for UI components
export const TOURNAMENT_TYPES = [
  { value: 'major', label: 'Major Event' },
  { value: 'tour', label: 'Tour Event' },
  { value: 'league', label: 'League Event' },
  { value: 'supr', label: 'SUPR Club Event' }
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
  'application/vnd.ms-excel' // .xls
];

// Sample data structure for tournament results upload
export const SAMPLE_TOURNAMENT_RESULTS_STRUCTURE = {
  Player: "Player full name",
  Position: "Finishing position (numeric)",
  Scoring: "Net score or 'StrokeNet'",
  Total: "Raw stroke total (numeric)",
  "Course Handicap": "Player's handicap (numeric)"
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
