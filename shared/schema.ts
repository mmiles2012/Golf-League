import { pgTable, text, serial, integer, boolean, timestamp, real, date, unique, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tournamentTypes = ['major', 'tour', 'league', 'supr'] as const;
export type TournamentType = typeof tournamentTypes[number];

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["player", "admin", "super_admin"] }).default("player").notNull(),
  homeClub: varchar("home_club", { length: 32 }).notNull(),
  friendsList: text("friends_list").array().default([]),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Player profiles linked to authenticated users
export const playerProfiles = pgTable("player_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  playerId: integer("player_id").references(() => players.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    userPlayerUnique: unique().on(table.userId, table.playerId),
  };
});

// Player link requests for manual approval when email matching fails
export const playerLinkRequests = pgTable("player_link_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  playerId: integer("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  status: varchar("status", { enum: ['pending', 'approved', 'rejected'] }).default('pending').notNull(),
  requestMessage: text("request_message"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewMessage: text("review_message"),
}, (table) => {
  return {
    userPlayerRequestUnique: unique().on(table.userId, table.playerId),
  };
});

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
  grossPosition: integer("gross_position"), // Gross position for separate tracking
  grossScore: real("gross_score"),
  netScore: real("net_score"),
  handicap: real("handicap"),
  points: real("points").notNull(), // Net points
  grossPoints: real("gross_points"), // Gross points (initially nullable for migration)
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
    grossPosition: z.number().nullable(), // Gross position (nullable for migration)
    grossScore: z.number().nullable(),
    netScore: z.number().nullable(),
    handicap: z.number().nullable(),
    points: z.number(), // Net points
    grossPoints: z.number().nullable() // Gross points (nullable for migration)
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
    position: z.number().int().positive("Position must be a positive integer").optional(), // Optional for automatic position calculation
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
  // Top 8 events calculation fields
  top8TotalPoints: z.number().optional(),
  top8TourPoints: z.number().optional(),
  top8MajorPoints: z.number().optional(),
  grossTop8TotalPoints: z.number().optional(),
  grossTop8TourPoints: z.number().optional(),
  grossTop8MajorPoints: z.number().optional(),
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

// User schemas for Replit Auth
export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string(),
  email: z.string().email().optional().nullable(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  profileImageUrl: z.string().url().optional().nullable(),
  role: z.enum(["player", "admin", "super_admin"]).default("player"),
  homeClub: z.string().min(1, "Home club is required"),
  friendsList: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export const updateUserProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  homeClub: z.string().min(1, "Home club is required"),
  friendsList: z.array(z.string()).optional().default([]),
});

export const playerProfileLinkSchema = createInsertSchema(playerProfiles).omit({
  id: true,
  createdAt: true,
});

export const playerLinkRequestSchema = createInsertSchema(playerLinkRequests).omit({
  id: true,
  requestedAt: true,
  reviewedAt: true,
  reviewedBy: true,
}).extend({
  requestMessage: z.string().optional(),
});

export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type PlayerProfileLink = z.infer<typeof playerProfileLinkSchema>;
export type PlayerProfile = typeof playerProfiles.$inferSelect;
export type PlayerLinkRequest = typeof playerLinkRequests.$inferSelect;
export type InsertPlayerLinkRequest = z.infer<typeof playerLinkRequestSchema>;

// Home club options table (editable by super-admin)
export const homeClubOptionsTable = pgTable("home_club_options", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 32 }).unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
