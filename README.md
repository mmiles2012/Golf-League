# Hideout Golf League

## Overview

Hideout Golf League is a web application for managing, tracking, and displaying golf tournament results, player statistics, and league leaderboards. The platform supports both public and admin views, allowing for tournament management, score uploads, and dynamic points configuration. The system is designed for flexibility, supporting multiple tournament types and custom points distributions.

---

## Key Features

- **Dynamic Leaderboards:** Real-time leaderboards for net and gross scoring, with sortable player histories.
- **Tournament Management:** Admins can create, edit, and delete tournaments, and enter results via a unified tournament entry screen (file upload or manual entry).
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
  - Enter tournament scores (file upload or manual entry, unified in one screen)
  - Configure points for each tournament type
  - Manage app settings (branding, scoring type, etc.)

---

## Site Navigation

- **Leaderboards:** Main page showing ranked players by points (net/gross)
- **Tournament Results:** List and details of past tournaments
- **Players:** Directory of all players with search and profile views
- **Admin Functions:**
  - Tournament Manager
  - Tournament Entry (Upload Scores & Manual Entry unified)
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
  - `type`: 'major' | 'tour' | 'league' | 'supr' | 'manual'
  - `scoringMode`: 'calculated' | 'manual'
  - `scoringType`: 'net' | 'gross' | 'both'
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
- Admins select Tournament Type, Scoring Mode, and Scoring Type for each event.
- The system displays the required spreadsheet columns and allows downloading a sample template for the selected configuration.
- Player results are stored and associated with tournaments.
- Points are calculated based on finishing position and the current points configuration for the tournament type (or assigned manually).
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

- `POST /api/upload` — Upload tournament results (Excel/CSV) or enter manually in the unified UI
- `POST /api/tournaments/process` — Process uploaded or manually entered tournament data

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

- **Tournament Management:** Create, edit, delete tournaments; enter scores via the unified tournament entry screen. For each event, select Tournament Type, Scoring Mode, and Scoring Type. The system will display the required fields and allow downloading a sample spreadsheet.
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

Uploads an Excel (.xlsx) or CSV file containing tournament results. The file is parsed and validated before processing.

#### **Required Columns**

The required columns for spreadsheet upload depend on the selected scoring mode and scoring type:

- **Calculated Mode:**
  - **Net Only:** `Player Name`, `Position`, `Net Score`, `Course Handicap`
  - **Gross Only:** `Player Name`, `Position`, `Gross Score`
  - **Both:** `Player Name`, `Position`, `Net Score`, `Gross Score`, `Course Handicap`
- **Manual Mode:**
  - `Player Name`, `Position`, `Points` (plus optional `Gross Score`, `Net Score`, `Course Handicap`)

The UI will display the exact required columns before upload, and you can download a sample spreadsheet template for your configuration.

#### **Sample Spreadsheet Download**

- On the unified tournament entry page, admins can download a sample spreadsheet template with the correct headers for the current tournament configuration (type, scoring mode, scoring type).
- This ensures that uploaded files always match the required format.

#### **Notes**

The tournament entry endpoint accepts Excel (`.xlsx`) and CSV files, or manual entry via the UI.
New players are created automatically if the name does not exist in the system.
The preview in the response shows how the data was parsed and calculated.

---

## Leaderboard Points, Positions, and Tie Logic

All leaderboard points, player positions, and tie logic (for both net and gross leaderboards) are calculated exclusively on the backend. The frontend does not perform any calculation or adjustment of these values. All leaderboard and player results pages, including CSV exports and modals, display only the data provided by the backend API endpoints:

- `/api/leaderboard/net`
- `/api/leaderboard/gross`
- Player/tournament results endpoints

**Frontend is display-only for these values.**

If you are developing or testing, ensure that any changes to points, positions, or tie logic are made in the backend codebase. The frontend will always reflect the backend as the source of truth.

---

## Deprecated: Frontend Points/Tie Calculation & Manual Entry Components

Previous versions of this project included frontend logic for calculating points, positions, and tie-breaking, and separate manual entry components. This logic and these components have been fully removed. All related helpers, tests, and manual entry forms have been deprecated or deleted. If you find references to frontend calculation or manual entry forms, they are no longer in use.

## UI Table Layouts & Responsiveness

- All leaderboard and results tables now use only Tailwind CSS utility classes for layout, sticky headers, column widths, and responsive design.
- All custom CSS for tables and wrappers has been removed from `index.css`.
- Horizontal scrolling is enforced for tables on narrow screens, with a floating scrollbar for accessibility.
- Table formatting and spacing is consistent between Net and Gross views, and no visual overlap occurs on any device.
- Sticky headers and sticky first columns are implemented using Tailwind classes.
