# Golf League Management Platform

## Overview
A professional golf league management platform that provides comprehensive tournament tracking, advanced score processing, and detailed performance analytics with enhanced precision in scoring calculations.

## Recent Changes
- **2025-07-02**: Fixed negative handicap handling for scratch and better players
  - **Removed Math.abs() calls**: Fixed frontend tournament upload processing to preserve negative handicap values instead of converting them to positive
  - **Updated TournamentUploader.tsx**: All four handicap parsing locations now correctly handle negative values for players better than scratch
  - **Verified backend compatibility**: Backend already correctly handles negative handicaps using Number() conversion and proper gross score calculation (net + handicap)
  - **Enhanced documentation**: Added clear examples in points-calculator.ts showing how negative handicaps work (e.g., Net 72 + Handicap -2 = Gross 70)
  - **Created comprehensive tests**: Updated handicap calculation tests to verify both positive and negative handicap scenarios work correctly
  - **Confirmed bidirectional conversion**: Net-to-gross and gross-to-net calculations maintain consistency for all handicap values
  - **Fixed historical data**: Identified and corrected 5 tournament results in "Tour Event #2 - Lofoten Links" where negative handicap players had incorrect gross scores
  - **Database verification**: Confirmed zero remaining gross score calculation mismatches across all tournaments - all negative handicap calculations now work correctly
- **2025-07-02**: Fixed critical gross points calculation issue for tour events
  - **Identified hardcoded values bug**: Migration scripts were calling `calculateGrossPoints()` without database `pointsConfig`, causing fallback to incorrect hardcoded values
  - **Database vs hardcoded discrepancy**: Tour events used hardcoded (1st=500, 2nd=400, 3rd=325) instead of database values (1st=500, 2nd=300, 3rd=190)
  - **Fixed 8 player results**: Updated tour tournament gross points to use correct database values (e.g., 3rd place: 145→190 points, 6th place: 95→100 points)
  - **Updated migration scripts**: Added proper database points configuration to `fix-gross-points-zero.ts` and `fix-major-gross-points.ts`
  - **Created tour-specific fix**: Built `fix-tour-gross-points.ts` to identify and correct tour event gross points using database values
  - **Verified tournament upload system**: Confirmed new tournament uploads correctly use database points configuration for both net and gross calculations through TieHandler and calculateGrossPoints with pointsConfig parameter
- **2025-07-01**: Fixed gross points calculations for major tournaments and improved gross position tracking
  - **Fixed major tournament gross points**: Major tournaments now correctly use major points table (1000, 800, 650, 520, 400...) instead of tour points for gross scoring
  - **Added gross position database field**: Added `grossPosition` column to player_results table for proper tracking of gross positions separately from net positions
  - **Enhanced tournament processing**: Updated tournament upload and manual entry to calculate and store gross positions using tournament-specific points tables
  - **Updated player history API**: Player modal now correctly displays gross position from database instead of using net position
  - **Improved gross points calculation**: Created `calculateGrossPoints(position, tournamentType)` function that uses tournament-specific points tables
  - **Database migrations completed**: All existing tournament results now have proper gross positions and corrected major tournament gross points
- **2025-07-01**: Fixed critical ES module compatibility issue preventing server startup
  - **Resolved CommonJS/ES module conflict**: Replaced `require.main === module` with ES module equivalent `import.meta.url === new URL(process.argv[1], 'file://').href`
  - **Server now starts successfully**: Application properly runs on port 5000 with all API endpoints functional
  - **Verified application functionality**: Confirmed API responses and server logging are working correctly
- **2025-07-01**: Successfully completed user deduplication and fixed profile system
  - **Implemented user deduplication script**: Created automated system to merge duplicate player records between tournament history and user accounts
  - **Successfully merged Mike Miles records**: Combined old player record (ID 3, 2 tournament results) with linked user account (ID 142), preserving all data
  - **Data preservation verified**: Tournament history, handicap information, and user linking all maintained correctly during merge
  - **Database cleanup completed**: Removed duplicate player records while maintaining referential integrity
- **2025-07-01**: Fixed profile update functionality and completed player authentication system
  - **Fixed profile update bug**: Corrected API request parameter order issue - `apiRequest` function was being called with (url, method, data) instead of (method, url, data)
  - **Verified profile updates working**: User can now successfully update display name and other profile fields
  - **Added comprehensive error logging**: Enhanced both frontend and backend logging for better debugging of API issues
  - **Tested with real user**: Confirmed profile update saves correctly to database and refreshes user data automatically
- **2025-07-01**: Successfully implemented automatic email matching and player link request system
  - **Verified automatic email matching**: When users log in, the system automatically checks for players with matching email addresses and creates links instantly
  - **Tested with real user login**: Confirmed automatic linking works - user mmmsmiles@... was automatically linked to player ID 142
  - **Added player link request database schema**: Created `playerLinkRequests` table for manual linking when email matching fails
  - **Implemented admin approval system**: Added API endpoints for admins to approve/reject player link requests
  - **Enhanced authentication flow**: Users get automatic linking first, then manual request option if no email match found
  - **Fixed PlayerDashboard runtime errors**: Added proper null safety for handling players without tournament history
- **2025-07-01**: Completed gross points data flow architecture
  - **Fixed gross leaderboard calculation**: Modified `calculatePlayerHistory` to include `grossTotalPoints`, `grossTourPoints`, and `grossMajorPoints` fields when in 'gross' mode
  - **Enhanced player history API**: Added `grossPoints`, `netPoints`, and `grossPosition` fields to tournament details in player history responses
  - **Verified complete data architecture**: All components (leaderboards, player modals, tournament results, player profiles) now correctly display both net and gross points from backend APIs
  - **Confirmed frontend-backend data integrity**: All components act as pure displays showing exact database values without recalculation
- **2025-06-30**: Verified and completed tournament upload point calculation system
  - **Verified tournament upload tie handling**: All point calculations work correctly for tied positions
  - **Fixed tournament preview logic**: Preview now properly handles ties for both new and existing players
  - **Enhanced manual entry**: Made position optional to allow automatic tie detection based on scores
  - **Confirmed database storage**: All net points, gross points, and tie-averaged points save correctly
  - **Comprehensive testing completed**: Verified Tour (300+190÷2=245pts), League (50+43.75÷2=46.9pts) calculations
- **2025-06-30**: Implemented separate net and gross points tracking system
  - Added `grossPoints` column to database schema for proper dual-scoring system
  - Migrated existing tournament data with calculated gross points using Tour points table
  - Updated tournament upload processing to calculate both net and gross points simultaneously
  - Created `calculateGrossPoints()` function using standard Tour points distribution (500, 300, 190, etc.)
  - Fixed leaderboard calculator to use appropriate points based on score type (net vs gross)
  - Updated frontend tournament results page to display gross points correctly
  - **Fixed gross points tie handling**: Applied proper tie detection and point averaging to gross score calculations
  - Fixed tournament upload and manual entry endpoints to use TieHandler for gross score ties
  - Migrated all existing tournament data to correct gross points with proper tie averaging
  - **Fixed net points display issue**: Resolved NaN values in net points column that were preventing proper display
  - **Fixed net points tie handling**: Applied proper tie detection and point averaging to net score calculations
  - Recalculated and updated all player results with correct net points using proper tie averaging (e.g., T2 gets (300+190)÷2 = 245 points)
  - Both net and gross points now use consistent tie handling with averaged points for tied positions
  - Net points: Based on net score positions using tournament-specific point tables (major/tour/league/supr)
  - Gross points: Based on gross score positions using standard Tour points regardless of tournament type with proper tie handling
- **2025-01-30**: Fixed critical server startup issue
  - Resolved invalid import path in `server/storage-db.ts` that was trying to access client-side code
  - Server was attempting to import `calculatePoints` from `../client/src/lib/points-calculator`
  - Fixed by importing from proper server-side `./utils` module instead
  - Application now starts successfully and all backend services are operational
- **2025-01-30**: Completely refactored leaderboard calculations into separate module
  - Created `server/leaderboard-calculator.ts` for all scoring logic
  - Implemented StrokeNet scoring system: Net Score = "total" column, Gross Score = Net + Handicap
  - Removed complex legacy scoring algorithms for cleaner codebase
  - Both net and gross leaderboards now reference each other consistently
- **2025-01-30**: Implemented comprehensive tie handling system
  - Created `server/tie-handler.ts` for proper golf tournament tie processing
  - Added proper position sharing for tied players (e.g., three players tie for 2nd place)
  - Implemented point averaging across tied positions according to golf standards
  - Updated tournament upload processing to use tie detection and position assignment
  - Enhanced frontend display to show "T2" format for tied positions with orange highlighting
  - Points are now properly distributed: tied players get average of all tied position points
  - **Successfully migrated existing tournament data**: Fixed Birdie Fest tournament where multiple ties were incorrectly scored, now showing proper point distribution (e.g., 3-way tie for 1st gets 330 points each instead of 500/300/300)
  - **Fixed all UI components**: Updated tournament results, player profiles, and player detail modals to display actual database points instead of recalculating, ensuring consistent tie-averaged points throughout the application

## Project Architecture

### Backend Structure
- **Express server** with TypeScript for API endpoints
- **PostgreSQL database** with Drizzle ORM for data persistence
- **Modular leaderboard calculations** in dedicated calculator class
- **File upload processing** for tournament data import

### Frontend Structure  
- **React with TypeScript** for UI components
- **Shadcn UI components** for consistent design system
- **React Query** for efficient data fetching and caching
- **Wouter** for client-side routing

### Key Features
- Tournament management with multiple scoring formats
- Player registration and handicap tracking
- Real-time leaderboard calculations
- Excel file import for tournament results
- Public leaderboard embeds with customization options
- Points configuration system for different tournament types

### Scoring System
Currently implements **StrokeNet** scoring:
- **Net Score**: Direct value from "total" column in uploaded files
- **Gross Score**: Calculated as Net Score + Course Handicap
- **Points**: Awarded based on position and tournament type (Major, Tour, League, SUPR)

## User Preferences
- Prefers modular, maintainable code architecture
- Values separation of concerns for complex calculations
- Requests clear documentation of scoring logic

## Technical Stack
- Node.js + Express + TypeScript
- React + Vite frontend
- PostgreSQL + Drizzle ORM
- Shadcn UI + Tailwind CSS
- React Query for state management