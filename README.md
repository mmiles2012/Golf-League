# Hideout Golf League

## Overview
Hideout Golf League is a web application for managing, tracking, and displaying golf tournament results, player statistics, and league leaderboards. The platform supports both public and admin views, allowing for tournament management, score uploads, manual entry, and dynamic points configuration. The system is designed for flexibility, supporting multiple tournament types and custom points distributions.

---

## Key Features
- **Dynamic Leaderboards:** Real-time leaderboards for net and gross scoring, with sortable player histories.
- **Tournament Management:** Admins can create, edit, and delete tournaments, upload scores, and manually enter results.
- **Points Configuration:** Fully customizable points distribution for each tournament type (Major, Tour, League, SUPR Club).
- **Player Management:** Add, search, and manage players, with detailed player histories and statistics.
- **Authentication:** Admin login/logout for secure access to management features; public users can view leaderboards and results.
- **Modern UI:** Responsive, accessible interface with sidebar navigation, tabs, and tooltips.
- **Data Visualization:** Interactive charts and tables for points, results, and player stats.

---

## User Roles & Workflows
### Public Users
- View leaderboards (net/gross)
- Browse tournament results
- View player profiles and stats
- See points distribution (read-only)

### Admin Users
- All public capabilities, plus:
  - Create/edit/delete tournaments and players
  - Upload tournament scores (file or manual entry)
  - Configure points for each tournament type
  - Manage app settings (branding, scoring type, etc.)

---

## Site Navigation
- **Leaderboards:** Main page showing ranked players by points (net/gross)
- **Tournament Results:** List and details of past tournaments
- **Players:** Directory of all players with search and profile views
- **Admin Functions:**
  - Tournament Manager
  - Upload Scores
  - Manual Entry
  - Points Config
  - App Setup

Navigation is handled via a sidebar and top navigation menu, with routes protected based on authentication state.

---

## Data Sources & Schemas
### Core Entities
- **League**
  - `id`: number
  - `name`: string
  - `description`: string | null
  - `season`: string | null
  - `isActive`: boolean
  - `createdAt`: Date
- **Player**
  - `id`: number
  - `name`: string
  - `email`: string | null
  - `defaultHandicap`: number | null
  - `createdAt`: Date
- **Tournament**
  - `id`: number
  - `name`: string
  - `date`: Date
  - `type`: 'major' | 'tour' | 'league' | 'supr'
  - `status`: string
  - `leagueId`: number | null
  - `createdAt`: Date
- **PlayerResult**
  - `id`: number
  - `playerId`: number
  - `tournamentId`: number
  - `position`: number
  - `grossScore`: number | null
  - `netScore`: number | null
  - `handicap`: number | null
  - `points`: number
  - `createdAt`: Date
- **PointsConfig**
  - `major`, `tour`, `league`, `supr`: Array<{ position: number, points: number }>
- **AppSettings**
  - `appName`: string
  - `pageTitle`: string
  - `scoringType`: 'net' | 'gross' | 'both'
  - `sidebarColor`: string
  - `logoUrl`: string

### Data Flow
- Tournament results are uploaded (Excel/JSON) or entered manually by admins.
- Player results are stored and associated with tournaments.
- Points are calculated based on finishing position and the current points configuration for the tournament type.
- Leaderboards aggregate player points across tournaments, supporting both net and gross scoring.
- Points configuration can be updated by admins and is versioned for recalculation.

### ER Diagram (Text Representation)
```
League (1) ───< (N) Tournament (1) ───< (N) PlayerResult >(N) ─── (1) Player
```
- **League** has many **Tournaments**
- **Tournament** has many **PlayerResults**
- **Player** has many **PlayerResults**

---

## API Routes & Example Usage
### Leagues
- `GET /api/leagues` — List all leagues
- `GET /api/leagues/:id` — Get league details
- `POST /api/leagues` — Create league
- `PUT /api/leagues/:id` — Update league
- `DELETE /api/leagues/:id` — Delete league

### Players
- `GET /api/players` — List all players
- `GET /api/players/:id` — Get player details
- `POST /api/players` — Create player
- `PUT /api/players/:id` — Update player
- `DELETE /api/players/:id` — Delete player

### Tournaments
- `GET /api/tournaments` — List all tournaments
- `GET /api/tournaments/:id` — Get tournament details (with results)
- `POST /api/tournaments` — Create tournament
- `PUT /api/tournaments/:id` — Update tournament
- `DELETE /api/tournaments/:id` — Delete tournament
- `GET /api/leagues/:id/tournaments` — List tournaments for a league

### Player Results
- `GET /api/player-results` — List all player results
- `GET /api/player-results/:id` — Get player result details

### Leaderboards
- `GET /api/leaderboard/net` — Net leaderboard
- `GET /api/leaderboard/gross` — Gross leaderboard

### Points Configuration
- `GET /api/points-config` — Get points config
- `PUT /api/points-config` — Update points config

### App Settings
- `GET /api/settings` — Get app settings
- `PUT /api/settings` — Update app settings

### File Upload & Processing
- `POST /api/upload` — Upload tournament results (Excel)
- `POST /api/tournaments/process` — Process uploaded tournament data
- `POST /api/tournaments/manual-entry` — Manual entry of tournament results

#### Example: Upload Tournament Results
```bash
curl -F "file=@results.xlsx" http://localhost:3000/api/upload
```

#### Example: Update Points Config
```json
PUT /api/points-config
{
  "major": [{ "position": 1, "points": 750 }, ...],
  "tour": [{ "position": 1, "points": 500 }, ...],
  ...
}
```

---

## Calculations & Logic
- **Points Assignment:**
  - Each tournament type has a customizable points table (editable by admins).
  - When results are entered, points are assigned to players based on their finishing position and the current config.
- **Leaderboard Calculation:**
  - Player histories are aggregated, and total points are calculated for net and gross leaderboards.
  - Rankings are assigned based on total points.
- **Data Validation:**
  - Points config is validated for structure before saving.
  - Player and tournament data are checked for consistency.
- **Translations/Transformations:**
  - Excel/JSON uploads are parsed and mapped to internal schema fields.
  - Special logic for certain tournaments (e.g., Open Championship) to adjust net scores as needed.
  - Player creation is automatic if a new name is found in uploads.

---

## Admin Actions
- **Tournament Management:** Create, edit, delete tournaments; upload or manually enter scores.
- **Player Management:** Add, edit, delete players (with checks for existing results).
- **Points Configuration:** Edit points for each position and tournament type; changes apply to future and recalculated tournaments.
- **App Setup:** Configure branding, scoring type, and other settings.

---

## Authentication & User Roles

### Player Login (Replit OAuth)
- All users authenticate via Replit's built-in OAuth-like authentication system (no custom password management).
- Players can log in to access their personal dashboard and profile.
- Players can only edit their own profile and friends list.

### Admin & Super-Admin
- Only users with emails/accounts from the domain `@hideoutgolf.club` can be admins.
- A super-admin role exists; only the super-admin can appoint or remove other admins.
- Admins can upload/manage tournaments and data.
- Domain enforcement is handled at login and when appointing new admins.

### Public View
- Non-authenticated users can view leaderboards, tournament results, and player profiles, but cannot edit or upload data.

## Player Dashboard Features
- Editable display name and home club (after login).
- Sorted tournament/match history with scores, positions, and points.
- Highlighted top 8 scores (used for standings) and dropped scores.
- Friends selection and filtered leaderboard view.

## Backend-Driven Logic
- All points, positions, and tie logic are calculated on the backend.
- Frontend is display-only for these values.
- Backend enforces all permissions and role-based access control.

---

## Formatting & Display
- **Tables:** Used for points configuration, tournament results, and player stats.
- **Charts:** Custom chart components for visualizing data (e.g., points trends, player performance).
- **Responsive Design:** Layout adapts for desktop and mobile.
- **Tooltips & Help:** Contextual help for points config and other complex features.

---

## Data Import/Export
- **Score Upload:** Admins can upload scores via file (e.g., Excel, JSON) or manual entry.
- **PDF/Spreadsheet Sources:** Default points tables are based on provided PDF and Excel files in `attached_assets/`.

---

## Technology Stack
- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, TypeScript, Drizzle ORM (with in-memory and DB storage options)
- **Visualization:** Recharts (custom chart wrappers)
- **State Management:** React Query
- **Authentication:** Context-based, with public/admin separation

---

## Getting Started
1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Access the app at `http://localhost:3000`
4. Sign in as admin to access management features

---

## File Structure (Highlights)
- `client/` — Frontend React app
- `server/` — Backend logic and storage
- `attached_assets/` — Reference PDFs, Excel, and JSON data
- `public/` — Static assets (logo, images)
- `migrate-scores.ts` — Data migration script

---

## Customization
- **Points Tables:** Edit via the Points Config admin page
- **Branding:** Update logo and colors in App Setup
- **Tournament Types:** Add or modify types in the backend and config

---

## License
This project is for internal league use. Contact the maintainer for permissions or contributions.

---

## Spreadsheet Upload Requirements (Admin)

### Endpoint: `POST /api/upload`
Uploads an Excel (.xlsx) file containing tournament results. The file is parsed and validated before processing.

#### **Required Columns**
- `Email` (or `email`): Player's email address (used for matching/creating players, case-insensitive)
- `Total`: Net score (numeric, required)
- `Course Handicap`: Player's course handicap (numeric, required)
- `Player`, `Name`, or `Display Name`: Player's display name (optional, used if creating a new player)
- `Pos`, `Position`, or `position`: Player's finishing position (optional; defaults to row order if missing)

#### **Processing Logic**
- **Player Matching:**
  - Players are matched by email (case-insensitive).
  - If no player is found for the email, a new player is created using the display name (or the email prefix if no name is provided).
- **Score Calculation:**
  - **Net Score:** Taken from the `Total` column.
  - **Gross Score:** Calculated as `Net Score + Course Handicap`.
- **Validation:**
  - Each row must have a valid email, net score (`Total`), and course handicap.
  - If any required field is missing or invalid, the upload is rejected with a clear error message indicating the row and issue.

#### **Error Handling**
- Missing or invalid `Email`, `Total`, or `Course Handicap` will cause the upload to fail.
- The response will include a message describing the error and the row number.

#### **Example Upload File**
| Email              | Player      | Total | Course Handicap | Pos |
|--------------------|-------------|-------|----------------|-----|
| alice@email.com    | Alice Smith | 72    | 10             | 1   |
| bob@email.com      | Bob Jones   | 75    | 12             | 2   |

#### **Example Response**
```json
{
  "message": "File uploaded successfully",
  "rows": 2,
  "preview": [
    {
      "Player": "Alice Smith",
      "Email": "alice@email.com",
      "Position": 1,
      "Gross Score": 82,
      "Net Score": 72,
      "Course Handicap": 10
    },
    ...
  ]
}
```

#### **Example Error Response**
```json
{
  "message": "Invalid or missing 'Total' (net score) for row 2"
}
```

#### **Notes**
- The upload endpoint only accepts Excel files (`.xlsx`).
- All emails are normalized to lowercase for matching.
- New players are created automatically if the email does not exist in the system.
- The preview in the response shows how the data was parsed and calculated.

---

## Leaderboard Points, Positions, and Tie Logic

All leaderboard points, player positions, and tie logic (for both net and gross leaderboards) are calculated exclusively on the backend. The frontend does not perform any calculation or adjustment of these values. All leaderboard and player results pages, including CSV exports and modals, display only the data provided by the backend API endpoints:

- `/api/leaderboard/net`
- `/api/leaderboard/gross`
- Player/tournament results endpoints

**Frontend is display-only for these values.**

If you are developing or testing, ensure that any changes to points, positions, or tie logic are made in the backend codebase. The frontend will always reflect the backend as the source of truth.

---

## Deprecated: Frontend Points/Tie Calculation

Previous versions of this project included frontend logic for calculating points, positions, and tie-breaking. This logic has been fully removed. All related helpers and tests have been deprecated or deleted. If you find references to frontend calculation, they are no longer in use.
