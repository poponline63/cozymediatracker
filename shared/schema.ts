import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session table for express-session
export const sessions = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { mode: "date" }).notNull(),
});

// User related tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  avatarUrl: text("avatar_url"),
  preferences: jsonb("preferences").default({
    theme: 'system',
    viewMode: 'grid',
    notifications: true
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const friends = pgTable("friends", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  friendId: integer("friend_id").notNull(),
  status: text("status").notNull(), // pending, accepted
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // started_watching, completed, rated, etc.
  mediaId: text("media_id"), // IMDB ID
  details: jsonb("details"), // Additional activity details
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Media tracking tables
export const watchlist = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  mediaId: text("media_id").notNull(), // IMDB ID
  title: text("title").notNull(),
  type: text("type").notNull(), // movie, series, anime
  posterUrl: text("poster_url"),
  status: text("status").notNull(), // watching, plan_to_watch, completed
  progress: integer("progress"), // Episode/season number for series
  rating: integer("rating"), // 1-5 stars
  notes: text("notes"),
  addedAt: timestamp("added_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const customLists = pgTable("custom_lists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const listItems = pgTable("list_items", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").notNull(),
  mediaId: text("media_id").notNull(),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export const watchParties = pgTable("watch_parties", {
  id: serial("id").primaryKey(),
  hostId: integer("host_id").notNull(),
  mediaId: text("media_id").notNull(),
  title: text("title").notNull(),
  scheduledFor: timestamp("scheduled_for").notNull(),
  description: text("description"),
  maxParticipants: integer("max_participants"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const partyParticipants = pgTable("party_participants", {
  id: serial("id").primaryKey(),
  partyId: integer("party_id").notNull(),
  userId: integer("user_id").notNull(),
  status: text("status").notNull(), // invited, accepted, declined
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

// Schema definitions
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  avatarUrl: true,
  preferences: true,
});

export const insertWatchlistSchema = createInsertSchema(watchlist).omit({
  id: true,
  userId: true,
  addedAt: true,
  updatedAt: true,
});

export const insertCustomListSchema = createInsertSchema(customLists).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertWatchPartySchema = createInsertSchema(watchParties).omit({
  id: true,
  hostId: true,
  createdAt: true,
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Watchlist = typeof watchlist.$inferSelect;
export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
export type CustomList = typeof customLists.$inferSelect;
export type InsertCustomList = z.infer<typeof insertCustomListSchema>;
export type WatchParty = typeof watchParties.$inferSelect;
export type InsertWatchParty = z.infer<typeof insertWatchPartySchema>;