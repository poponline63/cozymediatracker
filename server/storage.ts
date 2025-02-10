import {
  users,
  watchlist,
  currentlyWatching,
  watchSessions,
  ratings,
  type User,
  type InsertUser,
  type Watchlist,
  type InsertWatchlist,
  type CurrentlyWatching,
  type InsertCurrentlyWatching,
  type WatchSession,
  type InsertWatchSession,
  type Rating
} from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: { username?: string; password?: string; avatarUrl?: string; }): Promise<User>;

  // Currently Watching operations
  getCurrentlyWatching(userId: number): Promise<CurrentlyWatching[]>;
  getCurrentlyWatchingByMediaId(userId: number, mediaId: string): Promise<CurrentlyWatching | undefined>;
  startWatching(userId: number, item: InsertCurrentlyWatching): Promise<CurrentlyWatching>;
  updateProgress(id: number, progress: number): Promise<CurrentlyWatching>;
  getCurrentlyWatchingItem(id: number): Promise<CurrentlyWatching | undefined>;

  // Watchlist operations
  getWatchlist(userId: number): Promise<Watchlist[]>;
  getWatchlistByMediaId(userId: number, mediaId: string): Promise<Watchlist | undefined>;
  addToWatchlist(userId: number, item: InsertWatchlist): Promise<Watchlist>;
  removeFromWatchlist(id: number): Promise<void>;
  getWatchlistItem(id: number): Promise<Watchlist | undefined>;

  // Stats and recommendations
  getUserStatistics(userId: number): Promise<{
    totalItems: number;
    inProgressItems: number;
  }>;
  getCompletedMedia(userId: number): Promise<{
    mediaId: string;
    title: string;
    type: string;
    posterUrl: string | null;
  }[]>;

  // Watch Sessions
  getRecentWatchSessions(userId: number, mediaId?: string): Promise<{
    id: number;
    startTime: string;
    duration: number;
    title: string;
  }[]>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(
    id: number,
    updates: {
      username?: string;
      password?: string;
      avatarUrl?: string;
    }
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  // Currently Watching operations
  async getCurrentlyWatching(userId: number): Promise<CurrentlyWatching[]> {
    return db
      .select()
      .from(currentlyWatching)
      .where(eq(currentlyWatching.userId, userId))
      .orderBy(desc(currentlyWatching.updatedAt));
  }

  async getCurrentlyWatchingByMediaId(userId: number, mediaId: string): Promise<CurrentlyWatching | undefined> {
    const [watching] = await db
      .select()
      .from(currentlyWatching)
      .where(and(eq(currentlyWatching.userId, userId), eq(currentlyWatching.mediaId, mediaId)));
    return watching;
  }

  async startWatching(userId: number, data: InsertCurrentlyWatching): Promise<CurrentlyWatching> {
    const [item] = await db
      .insert(currentlyWatching)
      .values({
        ...data,
        userId,
        progress: 0,
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return item;
  }

  async updateProgress(id: number, progress: number): Promise<CurrentlyWatching> {
    const [updated] = await db
      .update(currentlyWatching)
      .set({
        progress,
        updatedAt: new Date(),
        lastWatched: new Date(),
      })
      .where(eq(currentlyWatching.id, id))
      .returning();

    if (!updated) throw new Error("Currently watching item not found");
    return updated;
  }

  async getCurrentlyWatchingItem(id: number): Promise<CurrentlyWatching | undefined> {
    const [item] = await db
      .select()
      .from(currentlyWatching)
      .where(eq(currentlyWatching.id, id));
    return item;
  }

  // Watchlist operations
  async getWatchlist(userId: number): Promise<Watchlist[]> {
    return db.select().from(watchlist).where(eq(watchlist.userId, userId));
  }

  async getWatchlistByMediaId(userId: number, mediaId: string): Promise<Watchlist | undefined> {
    const [item] = await db
      .select()
      .from(watchlist)
      .where(and(eq(watchlist.userId, userId), eq(watchlist.mediaId, mediaId)));
    return item;
  }

  async addToWatchlist(userId: number, item: InsertWatchlist): Promise<Watchlist> {
    const [watchlistItem] = await db
      .insert(watchlist)
      .values({ ...item, userId })
      .returning();
    return watchlistItem;
  }

  async removeFromWatchlist(id: number): Promise<void> {
    await db.delete(watchlist).where(eq(watchlist.id, id));
  }

  async getWatchlistItem(id: number): Promise<Watchlist | undefined> {
    const [item] = await db
      .select()
      .from(watchlist)
      .where(eq(watchlist.id, id));
    return item;
  }

  // Statistics and recommendations methods
  async getUserStatistics(userId: number) {
    const [watchingStats] = await db
      .select({
        totalItems: sql<number>`count(*)`,
        inProgressItems: sql<number>`sum(case when not is_completed and progress > 0 then 1 else 0 end)`,
      })
      .from(currentlyWatching)
      .where(eq(currentlyWatching.userId, userId));

    return {
      totalItems: watchingStats?.totalItems || 0,
      inProgressItems: watchingStats?.inProgressItems || 0,
    };
  }

  async getCompletedMedia(userId: number) {
    return db
      .select({
        mediaId: currentlyWatching.mediaId,
        title: currentlyWatching.title,
        type: currentlyWatching.type,
        posterUrl: currentlyWatching.posterUrl,
      })
      .from(currentlyWatching)
      .where(
        and(
          eq(currentlyWatching.userId, userId),
          eq(currentlyWatching.isCompleted, true)
        )
      )
      .orderBy(desc(currentlyWatching.updatedAt))
      .limit(10);
  }

  async getRecentWatchSessions(userId: number, mediaId?: string) {
    const query = db
      .select({
        id: watchSessions.id,
        startTime: watchSessions.startTime,
        duration: watchSessions.duration,
        title: currentlyWatching.title,
      })
      .from(watchSessions)
      .innerJoin(
        currentlyWatching,
        eq(watchSessions.watchlistId, currentlyWatching.id)
      )
      .where(eq(watchSessions.userId, userId))
      .orderBy(desc(watchSessions.startTime))
      .limit(10);

    if (mediaId) {
      query.where(eq(currentlyWatching.mediaId, mediaId));
    }

    return query;
  }
}

export const storage = new DatabaseStorage();