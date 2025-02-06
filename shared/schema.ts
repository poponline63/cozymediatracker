import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  avatarUrl: text("avatar_url"),
});

export const watchlist = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  mediaId: text("media_id").notNull(), // IMDB ID
  title: text("title").notNull(),
  type: text("type").notNull(), // movie, series, anime
  posterUrl: text("poster_url"),
  status: text("status").notNull(), // watching, plan_to_watch
  progress: integer("progress"), // Episode/season number for series
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  avatarUrl: true,
});

export const insertWatchlistSchema = createInsertSchema(watchlist).omit({
  id: true,
  userId: true,
  addedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Watchlist = typeof watchlist.$inferSelect;
export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
