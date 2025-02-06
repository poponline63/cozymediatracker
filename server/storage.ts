import { users, watchlist, customLists, listItems, type User, type InsertUser, type Watchlist, type InsertWatchlist, type CustomList, type InsertCustomList } from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { watchSessions } from "@shared/schema";
import { sql } from "drizzle-orm";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Watchlist operations
  getWatchlist(userId: number): Promise<Watchlist[]>;
  getWatchlistByMediaId(userId: number, mediaId: string): Promise<Watchlist | undefined>;
  addToWatchlist(userId: number, item: InsertWatchlist): Promise<Watchlist>;
  updateWatchlistStatus(id: number, status: string, progress?: number): Promise<Watchlist>;
  updateWatchlistRating(id: number, rating: number): Promise<Watchlist>;
  removeFromWatchlist(id: number): Promise<void>;

  // Custom lists operations
  getCustomLists(userId: number): Promise<CustomList[]>;
  getCustomList(id: number): Promise<CustomList | undefined>;
  createCustomList(userId: number, list: InsertCustomList): Promise<CustomList>;
  addToCustomList(listId: number, item: { mediaId: string; title: string; posterUrl: string }): Promise<any>;
  removeFromCustomList(itemId: number): Promise<void>;

  // Statistics methods
  getUserStatistics(userId: number): Promise<any>;
  getRecentWatchSessions(userId: number): Promise<any>;
  createWatchSession(userId: number, session: any): Promise<any>;

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

  async updateWatchlistStatus(
    id: number,
    status: string,
    progress?: number,
  ): Promise<Watchlist> {
    const [updated] = await db
      .update(watchlist)
      .set({ status, progress })
      .where(eq(watchlist.id, id))
      .returning();
    if (!updated) throw new Error("Watchlist item not found");
    return updated;
  }

  async updateWatchlistRating(id: number, rating: number): Promise<Watchlist> {
    const [updated] = await db
      .update(watchlist)
      .set({ rating })
      .where(eq(watchlist.id, id))
      .returning();
    if (!updated) throw new Error("Watchlist item not found");
    return updated;
  }

  async removeFromWatchlist(id: number): Promise<void> {
    await db.delete(watchlist).where(eq(watchlist.id, id));
  }

  // Custom lists operations
  async getCustomLists(userId: number): Promise<CustomList[]> {
    return db.select().from(customLists).where(eq(customLists.userId, userId));
  }

  async getCustomList(id: number): Promise<CustomList | undefined> {
    const [list] = await db.select().from(customLists).where(eq(customLists.id, id));
    return list;
  }

  async createCustomList(userId: number, list: InsertCustomList): Promise<CustomList> {
    const [newList] = await db
      .insert(customLists)
      .values({ ...list, userId })
      .returning();
    return newList;
  }

  async addToCustomList(
    listId: number,
    item: { mediaId: string; title: string; posterUrl: string }
  ): Promise<any> {
    const [listItem] = await db
      .insert(listItems)
      .values({ ...item, listId })
      .returning();
    return listItem;
  }

  async removeFromCustomList(itemId: number): Promise<void> {
    await db.delete(listItems).where(eq(listItems.id, itemId));
  }

  async getUserStatistics(userId: number) {
    const [totalStats] = await db
      .select({
        totalWatchtime: sql<number>`sum(total_watchtime)`,
        totalItems: sql<number>`count(*)`,
        averageRating: sql<number>`avg(rating)`,
        ratedItems: sql<number>`count(rating)`,
      })
      .from(watchlist)
      .where(eq(watchlist.userId, userId));

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
      ...totalStats,
      ...weeklyStats,
      watchTimeByDay,
    };
  }

  async getRecentWatchSessions(userId: number) {
    return db
      .select({
        id: watchSessions.id,
        title: watchlist.title,
        duration: watchSessions.duration,
        startTime: watchSessions.startTime,
      })
      .from(watchSessions)
      .innerJoin(watchlist, eq(watchSessions.watchlistId, watchlist.id))
      .where(eq(watchSessions.userId, userId))
      .orderBy(desc(watchSessions.startTime))
      .limit(10);
  }

  async createWatchSession(userId: number, session: any) {
    const [newSession] = await db
      .insert(watchSessions)
      .values({
        ...session,
        userId,
        duration: Math.floor((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000),
      })
      .returning();

    await db
      .update(watchlist)
      .set({
        totalWatchtime: sql`total_watchtime + ${newSession.duration}`,
        lastWatched: new Date(),
      })
      .where(eq(watchlist.id, session.watchlistId));

    return newSession;
  }
}

export const storage = new DatabaseStorage();