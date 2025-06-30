# Golf League Management Platform

## Overview
A professional golf league management platform that provides comprehensive tournament tracking, advanced score processing, and detailed performance analytics with enhanced precision in scoring calculations.

## Recent Changes
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
  - Recalculated and updated all 45 affected player results with correct net points based on position and tournament type
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