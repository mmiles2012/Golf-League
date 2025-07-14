CREATE TABLE "home_club_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(32) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "home_club_options_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "leagues" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"season" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_link_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"player_id" integer NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"request_message" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by" varchar,
	"review_message" text,
	CONSTRAINT "player_link_requests_user_id_player_id_unique" UNIQUE("user_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "player_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"player_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "player_profiles_user_id_player_id_unique" UNIQUE("user_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "player_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"tournament_id" integer NOT NULL,
	"position" integer NOT NULL,
	"gross_position" integer,
	"gross_score" real,
	"net_score" real,
	"handicap" real,
	"points" real NOT NULL,
	"gross_points" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "player_results_player_id_tournament_id_unique" UNIQUE("player_id","tournament_id")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"default_handicap" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"date" date NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"league_id" integer,
	"is_manual_entry" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" varchar DEFAULT 'player' NOT NULL,
	"home_club" varchar(32) NOT NULL,
	"friends_list" text[] DEFAULT '{}',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "player_link_requests" ADD CONSTRAINT "player_link_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_link_requests" ADD CONSTRAINT "player_link_requests_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_link_requests" ADD CONSTRAINT "player_link_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_profiles" ADD CONSTRAINT "player_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_profiles" ADD CONSTRAINT "player_profiles_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_results" ADD CONSTRAINT "player_results_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_results" ADD CONSTRAINT "player_results_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");