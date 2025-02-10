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
  updateProgress(
    id: number,
    progress: number,
    episodeData?: {
      currentSeason?: number;
      currentEpisode?: number;
    }
  ): Promise<CurrentlyWatching>;
  getCurrentlyWatchingItem(id: number): Promise<CurrentlyWatching | undefined>;
  stopWatching(id: number): Promise<void>;
  markAsCompleted(id: number): Promise<CurrentlyWatching>;

  // Watchlist operations
  getWatchlist(userId: number): Promise<Watchlist[]>;
  getWatchlistByMediaId(userId: number, mediaId: string): Promise<Watchlist | undefined>;
  addToWatchlist(userId: number, item: InsertWatchlist): Promise<Watchlist>;
  removeFromWatchlist(id: number): Promise<void>;
  getWatchlistItem(id: number): Promise<Watchlist | undefined>;
  moveToWatchlist(userId: number, currentlyWatchingId: number): Promise<Watchlist>;

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
  getRecommendations(userId: number): Promise<{
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
  createWatchSession(userId: number, data: {
    mediaId: string;
    watchlistId: number;
    startTime: Date;
    endTime: Date;
    duration: number;
  }): Promise<WatchSession>;

  sessionStore: session.Store;
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

  async updateProgress(
    id: number,
    progress: number,
    episodeData?: {
      currentSeason?: number;
      currentEpisode?: number;
    }
  ): Promise<CurrentlyWatching> {
    const [updated] = await db
      .update(currentlyWatching)
      .set({
        progress,
        currentSeason: episodeData?.currentSeason,
        currentEpisode: episodeData?.currentEpisode,
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

  async stopWatching(id: number): Promise<void> {
    try {
      const result = await db.delete(currentlyWatching)
        .where(eq(currentlyWatching.id, id))
        .returning();

      if (!result.length) {
        throw new Error("Currently watching item not found");
      }
    } catch (error) {
      console.error("Error in stopWatching:", error);
      throw error;
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

  async moveToWatchlist(userId: number, currentlyWatchingId: number): Promise<Watchlist> {
    try {
      // First verify the item exists and belongs to the user
      const item = await this.getCurrentlyWatchingItem(currentlyWatchingId);
      if (!item) {
        console.error("Currently watching item not found:", currentlyWatchingId);
        throw new Error("Currently watching item not found");
      }

      if (item.userId !== userId) {
        console.error("Not authorized to move item:", { userId, itemUserId: item.userId });
        throw new Error("Not authorized to move this item");
      }

      return await db.transaction(async (tx) => {
        // Add to watchlist first
        const [watchlistItem] = await tx
          .insert(watchlist)
          .values({
            userId,
            mediaId: item.mediaId,
            title: item.title,
            type: item.type,
            posterUrl: item.posterUrl,
            status: "plan_to_watch",
            progress: item.progress,
            totalWatchtime: item.totalWatchtime,
            lastWatched: item.lastWatched,
            addedAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        if (!watchlistItem) {
          throw new Error("Failed to create watchlist item");
        }

        // Then remove from currently watching
        const [deletedItem] = await tx
          .delete(currentlyWatching)
          .where(eq(currentlyWatching.id, currentlyWatchingId))
          .returning();

        if (!deletedItem) {
          throw new Error("Failed to remove item from currently watching");
        }

        return watchlistItem;
      });
    } catch (error) {
      console.error("Transaction failed:", error);
      throw error; // Re-throw the error to be handled by the route handler
    }
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
        startTime: sql<string>`to_char(${watchSessions.startTime}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
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
      return query.where(eq(currentlyWatching.mediaId, mediaId));
    }

    return query;
  }

  async markAsCompleted(id: number): Promise<CurrentlyWatching> {
    const [updated] = await db
      .update(currentlyWatching)
      .set({
        isCompleted: true,
        progress: 100,
        updatedAt: new Date()
      })
      .where(eq(currentlyWatching.id, id))
      .returning();

    if (!updated) throw new Error("Currently watching item not found");
    return updated;
  }

  async createWatchSession(userId: number, data: {
    mediaId: string;
    watchlistId: number;
    startTime: Date;
    endTime: Date;
    duration: number;
  }): Promise<WatchSession> {
    const [session] = await db
      .insert(watchSessions)
      .values({
        userId,
        mediaId: data.mediaId,
        watchlistId: data.watchlistId,
        startTime: data.startTime,
        endTime: data.endTime,
        duration: data.duration,
      })
      .returning();
    return session;
  }

  async getRecommendations(userId: number) {
    // For now, return recently completed items from other users
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
          eq(currentlyWatching.isCompleted, true),
          sql`${currentlyWatching.userId} != ${userId}`
        )
      )
      .limit(10);
  }

  async upsertRating(userId: number, mediaId: string, rating: number): Promise<Rating> {
    const [existing] = await db
      .select()
      .from(ratings)
      .where(
        and(
          eq(ratings.userId, userId),
          eq(ratings.mediaId, mediaId)
        )
      );

    if (existing) {
      const [updated] = await db
        .update(ratings)
        .set({
          rating,
          updatedAt: new Date(),
        })
        .where(eq(ratings.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(ratings)
      .values({
        userId,
        mediaId,
        rating,
      })
      .returning();
    return created;
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
      .where(
        and(
          eq(ratings.userId, userId),
          eq(ratings.mediaId, mediaId)
        )
      );
  }
}

export const storage = new DatabaseStorage();