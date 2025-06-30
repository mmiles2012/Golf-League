# Golf League Management Platform

## Overview
A professional golf league management platform that provides comprehensive tournament tracking, advanced score processing, and detailed performance analytics with enhanced precision in scoring calculations.

## Recent Changes
- **2025-01-30**: Completely refactored leaderboard calculations into separate module
  - Created `server/leaderboard-calculator.ts` for all scoring logic
  - Implemented StrokeNet scoring system: Net Score = "total" column, Gross Score = Net + Handicap
  - Removed complex legacy scoring algorithms for cleaner codebase
  - Both net and gross leaderboards now reference each other consistently

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