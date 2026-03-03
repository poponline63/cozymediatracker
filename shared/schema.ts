import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Keep existing session table definition
export const sessions = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { mode: "date" }).notNull(),
});

// User related tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  avatarUrl: text("avatar_url"),
  preferences: jsonb("preferences").default({
    theme: 'system',
    viewMode: 'grid',
    notifications: true
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Currently watching table for active media
export const currentlyWatching = pgTable("currently_watching", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  mediaId: text("media_id").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(), // movie, series
  posterUrl: text("poster_url"),
  progress: integer("progress").default(0), // percentage for movies, episode progress for series
  currentSeason: integer("current_season"), // Only for series
  currentEpisode: integer("current_episode"), // Only for series
  totalSeasons: integer("total_seasons"), // Only for series
  isCompleted: boolean("is_completed").default(false),
  totalWatchtime: integer("total_watchtime").default(0), // in minutes
  lastWatched: timestamp("last_watched"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Watchlist for planning future watches
export const watchlist = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  mediaId: text("media_id").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  posterUrl: text("poster_url"),
  status: text("status").notNull(), // plan_to_watch, completed
  progress: integer("progress"), // For migration purposes
  totalWatchtime: integer("total_watchtime"), // For migration purposes
  lastWatched: timestamp("last_watched"),
  rating: integer("rating"), // 1-5 stars
  notes: text("notes"),
  addedAt: timestamp("added_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Watch sessions for tracking viewing history
export const watchSessions = pgTable("watch_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  mediaId: text("media_id").notNull(),
  watchlistId: integer("watchlist_id").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in minutes
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Ratings table for user media ratings
export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  mediaId: text("media_id").notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Schema definitions
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  avatarUrl: true,
  preferences: true,
});

export const insertCurrentlyWatchingSchema = createInsertSchema(currentlyWatching).omit({
  id: true,
  userId: true,
  isCompleted: true,
  totalWatchtime: true,
  startedAt: true,
  updatedAt: true,
});

export const insertWatchlistSchema = createInsertSchema(watchlist).omit({
  id: true,
  userId: true,
  addedAt: true,
  updatedAt: true,
});

export const insertWatchSessionSchema = createInsertSchema(watchSessions).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertRatingSchema = createInsertSchema(ratings).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

// Custom Lists tables
export const customLists = pgTable("custom_lists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const customListItems = pgTable("custom_list_items", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").notNull(),
  mediaId: text("media_id").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  posterUrl: text("poster_url"),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

// Friends / social table
export const friendships = pgTable("friendships", {
  id: serial("id").primaryKey(),
  requesterId: integer("requester_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Schemas for new tables
export const insertCustomListSchema = createInsertSchema(customLists).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomListItemSchema = createInsertSchema(customListItems).omit({
  id: true,
  addedAt: true,
});

export const insertFriendshipSchema = createInsertSchema(friendships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type CurrentlyWatching = typeof currentlyWatching.$inferSelect;
export type InsertCurrentlyWatching = z.infer<typeof insertCurrentlyWatchingSchema>;
export type Watchlist = typeof watchlist.$inferSelect;
export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
export type WatchSession = typeof watchSessions.$inferSelect;
export type InsertWatchSession = z.infer<typeof insertWatchSessionSchema>;
export type Rating = typeof ratings.$inferSelect;
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type CustomList = typeof customLists.$inferSelect;
export type InsertCustomList = z.infer<typeof insertCustomListSchema>;
export type CustomListItem = typeof customListItems.$inferSelect;
export type InsertCustomListItem = z.infer<typeof insertCustomListItemSchema>;
export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;