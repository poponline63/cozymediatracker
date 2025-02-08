import { 
  users, 
  watchlist, 
  currentlyWatching,
  watchSessions,
  type User, 
  type InsertUser, 
  type Watchlist, 
  type InsertWatchlist,
  type CurrentlyWatching,
  type InsertCurrentlyWatching,
  type WatchSession,
  type InsertWatchSession
} from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { sql } from "drizzle-orm";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Currently Watching operations
  getCurrentlyWatching(userId: number): Promise<CurrentlyWatching[]>;
  getCurrentlyWatchingByMediaId(userId: number, mediaId: string): Promise<CurrentlyWatching | undefined>;
  startWatching(userId: number, item: InsertCurrentlyWatching): Promise<CurrentlyWatching>;
  updateProgress(id: number, progress: number, seasonEpisodeInfo?: { currentSeason?: number, currentEpisode?: number }): Promise<CurrentlyWatching>;
  markAsCompleted(id: number): Promise<CurrentlyWatching>;
  stopWatching(id: number): Promise<void>;
  getCurrentlyWatchingItem(id: number): Promise<CurrentlyWatching | undefined>; // Added method

  // Watchlist operations
  getWatchlist(userId: number): Promise<Watchlist[]>;
  getWatchlistByMediaId(userId: number, mediaId: string): Promise<Watchlist | undefined>;
  addToWatchlist(userId: number, item: InsertWatchlist): Promise<Watchlist>;
  removeFromWatchlist(id: number): Promise<void>;
  getWatchlistItem(id: number): Promise<Watchlist | undefined>;

  // Statistics methods
  getUserStatistics(userId: number): Promise<any>;
  getRecentWatchSessions(userId: number): Promise<any>;
  createWatchSession(userId: number, session: InsertWatchSession): Promise<WatchSession>;

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

  async updateProgress(
    id: number,
    progress: number,
    seasonEpisodeInfo?: { currentSeason?: number; currentEpisode?: number }
  ): Promise<CurrentlyWatching> {
    const [updated] = await db
      .update(currentlyWatching)
      .set({
        progress,
        currentSeason: seasonEpisodeInfo?.currentSeason,
        currentEpisode: seasonEpisodeInfo?.currentEpisode,
        updatedAt: new Date(),
        lastWatched: new Date(),
      })
      .where(eq(currentlyWatching.id, id))
      .returning();

    if (!updated) throw new Error("Currently watching item not found");
    return updated;
  }

  async markAsCompleted(id: number): Promise<CurrentlyWatching> {
    const [updated] = await db
      .update(currentlyWatching)
      .set({
        isCompleted: true,
        progress: 100,
        updatedAt: new Date(),
      })
      .where(eq(currentlyWatching.id, id))
      .returning();

    if (!updated) throw new Error("Currently watching item not found");
    return updated;
  }

  async stopWatching(id: number): Promise<void> {
    await db.delete(currentlyWatching).where(eq(currentlyWatching.id, id));
  }

  async getCurrentlyWatchingItem(id: number): Promise<CurrentlyWatching | undefined> { // Added method implementation
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
      .values({ ...item, userId, status: "plan_to_watch" })
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

  async getUserStatistics(userId: number) {
    // Get statistics for currently watching items
    const [watchingStats] = await db
      .select({
        totalWatchtime: sql<number>`sum(total_watchtime)`,
        totalItems: sql<number>`count(*)`,
        completedItems: sql<number>`sum(case when is_completed then 1 else 0 end)`,
        inProgressItems: sql<number>`sum(case when not is_completed and progress > 0 then 1 else 0 end)`,
      })
      .from(currentlyWatching)
      .where(eq(currentlyWatching.userId, userId));

    const [weeklyStats] = await db
      .select({
        averageDailyWatchtime: sql<number>`avg(duration)`,
      })
      .from(watchSessions)
      .where(
        and(
          eq(watchSessions.userId, userId),
          sql`${watchSessions.startTime} > now() - interval '7 days'`
        )
      );

    const watchTimeByDay = await db
      .select({
        day: sql<string>`to_char(start_time, 'Day')`,
        hours: sql<number>`sum(duration) / 60.0`,
      })
      .from(watchSessions)
      .where(eq(watchSessions.userId, userId))
      .groupBy(sql`to_char(start_time, 'Day')`)
      .orderBy(sql`min(extract(dow from start_time))`);

    return {
      ...watchingStats,
      ...weeklyStats,
      watchTimeByDay,
    };
  }

  async getRecentWatchSessions(userId: number) {
    return db
      .select({
        id: watchSessions.id,
        title: currentlyWatching.title,
        duration: watchSessions.duration,
        startTime: watchSessions.startTime,
      })
      .from(watchSessions)
      .innerJoin(currentlyWatching, eq(watchSessions.mediaId, currentlyWatching.mediaId))
      .where(eq(watchSessions.userId, userId))
      .orderBy(desc(watchSessions.startTime))
      .limit(10);
  }

  async createWatchSession(userId: number, session: InsertWatchSession): Promise<WatchSession> {
    const [newSession] = await db
      .insert(watchSessions)
      .values({
        ...session,
        userId,
        duration: Math.floor((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000),
      })
      .returning();

    await db
      .update(currentlyWatching)
      .set({
        totalWatchtime: sql`total_watchtime + ${newSession.duration}`,
        lastWatched: new Date(),
      })
      .where(and(
        eq(currentlyWatching.userId, userId),
        eq(currentlyWatching.mediaId, session.mediaId)
      ));

    return newSession;
  }
}

export const storage = new DatabaseStorage();