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

  // Currently Watching operations
  getCurrentlyWatching(userId: number): Promise<CurrentlyWatching[]>;
  getCurrentlyWatchingByMediaId(userId: number, mediaId: string): Promise<CurrentlyWatching | undefined>;
  startWatching(userId: number, item: InsertCurrentlyWatching): Promise<CurrentlyWatching>;
  updateProgress(id: number, progress: number, seasonEpisodeInfo?: { currentSeason?: number, currentEpisode?: number }): Promise<CurrentlyWatching>;
  markAsCompleted(id: number): Promise<CurrentlyWatching>;
  stopWatching(id: number): Promise<void>;
  getCurrentlyWatchingItem(id: number): Promise<CurrentlyWatching | undefined>;
  getCompletedMedia(userId: number): Promise<CurrentlyWatching[]>;
  getRecommendations(userId: number): Promise<any[]>;

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
  // Add new method for updating user profile
  updateUser(
    id: number,
    updates: {
      username?: string;
      password?: string;
      avatarUrl?: string;
    }
  ): Promise<User>;

  // Rating operations
  upsertRating(userId: number, mediaId: string, rating: number): Promise<Rating>;
  getRatingsByMediaIds(userId: number, mediaIds: string[]): Promise<Rating[]>;
  deleteRating(userId: number, mediaId: string): Promise<void>;
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

  async getCurrentlyWatchingItem(id: number): Promise<CurrentlyWatching | undefined> {
    const [item] = await db
      .select()
      .from(currentlyWatching)
      .where(eq(currentlyWatching.id, id));
    return item;
  }

  async getCompletedMedia(userId: number): Promise<CurrentlyWatching[]> {
    return db
      .select()
      .from(currentlyWatching)
      .where(
        and(
          eq(currentlyWatching.userId, userId),
          eq(currentlyWatching.isCompleted, true)
        )
      )
      .orderBy(desc(currentlyWatching.updatedAt));
  }

  async getRecommendations(userId: number): Promise<any[]> {
    try {
      // Get all media IDs to exclude (both from currently watching and watchlist)
      const existingMediaIds = await db
        .select({ mediaId: currentlyWatching.mediaId })
        .from(currentlyWatching)
        .where(eq(currentlyWatching.userId, userId));

      const watchlistMediaIds = await db
        .select({ mediaId: watchlist.mediaId })
        .from(watchlist)
        .where(eq(watchlist.userId, userId));

      const excludeMediaIds = [
        ...existingMediaIds.map(item => item.mediaId),
        ...watchlistMediaIds.map(item => item.mediaId)
      ];

      // Query for recommendations, excluding user's current items
      const recommendations = await db.execute<{ mediaId: string; title: string; type: string; posterUrl: string | null }>(sql`
        WITH RankedMedia AS (
          SELECT 
            media_id,
            title,
            type,
            poster_url,
            COUNT(*) as completion_count,
            ROW_NUMBER() OVER (PARTITION BY media_id ORDER BY COUNT(*) DESC) as rn
          FROM currently_watching
          WHERE is_completed = true
            AND media_id NOT IN (${sql.join(excludeMediaIds, sql`, `)})
          GROUP BY media_id, title, type, poster_url
        )
        SELECT 
          media_id as "mediaId",
          title,
          type,
          poster_url as "posterUrl"
        FROM RankedMedia
        WHERE rn = 1
        ORDER BY completion_count DESC
        LIMIT 10
      `);

      return recommendations.rows;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
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
    // Get only essential statistics for currently watching items
    const [watchingStats] = await db
      .select({
        totalItems: sql<number>`count(*)`,
        inProgressItems: sql<number>`sum(case when not is_completed and progress > 0 then 1 else 0 end)`,
      })
      .from(currentlyWatching)
      .where(eq(currentlyWatching.userId, userId));

    // Return only the essential counts
    return {
      totalItems: watchingStats?.totalItems || 0,
      inProgressItems: watchingStats?.inProgressItems || 0,
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
      .limit(5);
  }

  async createWatchSession(userId: number, session: InsertWatchSession): Promise<WatchSession> {
    // Ensure we have valid dates by explicitly checking and converting
    const startTime = session.startTime ? new Date(session.startTime) : new Date();
    const endTime = session.endTime ? new Date(session.endTime) : new Date();
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);

    const [newSession] = await db
      .insert(watchSessions)
      .values({
        ...session,
        userId,
        duration,
      })
      .returning();

    await db
      .update(currentlyWatching)
      .set({
        totalWatchtime: sql`total_watchtime + ${duration}`,
        lastWatched: new Date(),
      })
      .where(and(
        eq(currentlyWatching.userId, userId),
        eq(currentlyWatching.mediaId, session.mediaId)
      ));

    return newSession;
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
      .set({
        username: updates.username,
        password: updates.password,
        avatarUrl: updates.avatarUrl,
      })
      .where(eq(users.id, id))
      .returning();

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  // Rating operations
  async upsertRating(userId: number, mediaId: string, rating: number): Promise<Rating> {
    // Check if rating exists
    const [existingRating] = await db
      .select()
      .from(ratings)
      .where(and(eq(ratings.userId, userId), eq(ratings.mediaId, mediaId)));

    if (existingRating) {
      // Update existing rating
      const [updated] = await db
        .update(ratings)
        .set({
          rating,
          updatedAt: new Date(),
        })
        .where(and(eq(ratings.userId, userId), eq(ratings.mediaId, mediaId)))
        .returning();
      return updated;
    } else {
      // Create new rating
      const [newRating] = await db
        .insert(ratings)
        .values({
          userId,
          mediaId,
          rating,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return newRating;
    }
  }

  async getRatingsByMediaIds(userId: number, mediaIds: string[]): Promise<Rating[]> {
    return db
      .select()
      .from(ratings)
      .where(
        and(
          eq(ratings.userId, userId),
          inArray(ratings.mediaId, mediaIds)
        )
      );
  }

  async deleteRating(userId: number, mediaId: string): Promise<void> {
    await db
      .delete(ratings)
      .where(and(eq(ratings.userId, userId), eq(ratings.mediaId, mediaId)));
  }
}

export const storage = new DatabaseStorage();