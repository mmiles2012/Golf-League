import { pgTable, text, serial, integer, boolean, timestamp, real, date, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tournamentTypes = ['major', 'tour', 'league', 'supr'] as const;
export type TournamentType = typeof tournamentTypes[number];

// League table to store multiple leagues
export const leagues = pgTable("leagues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  season: text("season"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  defaultHandicap: real("default_handicap"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: date("date").notNull(),
  type: text("type").$type<TournamentType>().notNull(),
  status: text("status").default("completed").notNull(),
  leagueId: integer("league_id").references(() => leagues.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const playerResults = pgTable("player_results", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  tournamentId: integer("tournament_id").notNull().references(() => tournaments.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  grossScore: integer("gross_score"),
  netScore: integer("net_score"),
  handicap: real("handicap"),
  points: real("points").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    playerTournamentUnique: unique().on(table.playerId, table.tournamentId),
  };
});

// Create insert schemas using drizzle-zod
export const insertLeagueSchema = createInsertSchema(leagues).omit({
  id: true,
  createdAt: true,
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  createdAt: true,
});

export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true,
  createdAt: true,
}).extend({
  type: z.enum(tournamentTypes),
  leagueId: z.number().optional(),
});

export const insertPlayerResultSchema = createInsertSchema(playerResults)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    // Ensure these fields can be properly null
    grossScore: z.number().nullable(),
    netScore: z.number().nullable(),
    handicap: z.number().nullable()
  });

// Define types using schema inference
export type InsertLeague = z.infer<typeof insertLeagueSchema>;
export type League = typeof leagues.$inferSelect;

export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;

export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Tournament = typeof tournaments.$inferSelect;

export type InsertPlayerResult = z.infer<typeof insertPlayerResultSchema>;
export type PlayerResult = typeof playerResults.$inferSelect;

// Schema for tournament upload with Excel data
export const tournamentUploadSchema = z.object({
  name: z.string().min(1, "Tournament name is required"),
  date: z.string().refine(val => !isNaN(Date.parse(val)), "Invalid date format"),
  type: z.enum(tournamentTypes),
  leagueId: z.number().optional(),
  results: z.array(z.object({
    player: z.string().min(1, "Player name is required"),
    position: z.coerce.number().int().positive("Position must be a positive integer"),
    grossScore: z.coerce.number().nullable().optional(),
    netScore: z.coerce.number().nullable().optional(),
    handicap: z.coerce.number().nullable().optional(),
  })).min(1, "At least one player result is required"),
});

export type TournamentUpload = z.infer<typeof tournamentUploadSchema>;

// Schema for manual entry
export const manualEntrySchema = insertTournamentSchema.extend({
  leagueId: z.number().optional(),
  results: z.array(z.object({
    playerId: z.number().optional(),
    playerName: z.string().min(1, "Player name is required"),
    position: z.number().int().positive("Position must be a positive integer"),
    grossScore: z.number().optional(),
    netScore: z.number().optional(),
    handicap: z.number().optional(),
  })).min(1, "At least one player result is required"),
});

export type ManualEntry = z.infer<typeof manualEntrySchema>;

// Schema for tournament editing
export const editTournamentSchema = z.object({
  id: z.number(),
  name: z.string().min(1, "Tournament name is required"),
  date: z.string().refine(val => !isNaN(Date.parse(val)), "Invalid date format"),
  type: z.enum(tournamentTypes),
  leagueId: z.number().optional(),
  results: z.array(z.object({
    id: z.number().optional(),
    playerId: z.number(),
    position: z.number().int().positive("Position must be a positive integer"),
    grossScore: z.number().optional(),
    netScore: z.number().optional(),
    handicap: z.number().optional(),
    points: z.number().optional(),
  })),
});

export type EditTournament = z.infer<typeof editTournamentSchema>;

// Schema for player with tournament history
export const playerWithHistorySchema = z.object({
  player: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().optional().nullable(),
    defaultHandicap: z.number().optional().nullable(),
  }),
  tournaments: z.array(z.object({
    id: z.number(),
    tournamentId: z.number(),
    tournamentName: z.string(),
    tournamentDate: z.string(),
    tournamentType: z.enum(tournamentTypes),
    position: z.number(), // Net position (default position)
    grossPosition: z.number().optional(), // Gross position (based on gross score) 
    grossScore: z.number().optional().nullable(),
    netScore: z.number().optional().nullable(),
    handicap: z.number().optional().nullable(),
    points: z.number(),
    grossPoints: z.number().optional().nullable(),
    netPoints: z.number().optional().nullable(),
    displayScore: z.number().optional().nullable(),
  })),
  totalPoints: z.number(),
  majorPoints: z.number(),
  tourPoints: z.number(),
  leaguePoints: z.number(),
  suprPoints: z.number(),
  totalEvents: z.number(),
  rank: z.number(),
  averageGrossScore: z.number().optional(),
  averageNetScore: z.number().optional(),
  averageScore: z.number().optional(),
  grossTourPoints: z.number().optional(),
  grossTotalPoints: z.number().optional(),
});

export type PlayerWithHistory = z.infer<typeof playerWithHistorySchema>;

// Points configuration schema
export const pointsConfigSchema = z.object({
  major: z.array(z.object({
    position: z.number(),
    points: z.number()
  })),
  tour: z.array(z.object({
    position: z.number(),
    points: z.number()
  })),
  league: z.array(z.object({
    position: z.number(),
    points: z.number()
  })),
  supr: z.array(z.object({
    position: z.number(),
    points: z.number()
  }))
});

export type PointsConfig = z.infer<typeof pointsConfigSchema>;

// App Settings schema
export const appSettingsSchema = z.object({
  appName: z.string(),
  pageTitle: z.string(),
  scoringType: z.enum(['net', 'gross', 'both']),
  sidebarColor: z.string(),
  logoUrl: z.string()
});

export type AppSettings = z.infer<typeof appSettingsSchema>;
