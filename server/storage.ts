import {
  users,
  watchlist,
  currentlyWatching,
  watchSessions,
  ratings,
  customLists,
  customListItems,
  friendships,
  activities,
  activityLikes,
  activityComments,
  userAchievements,
  watchGoals,
  emailVerificationTokens,
  type User,
  type InsertUser,
  type Watchlist,
  type InsertWatchlist,
  type CurrentlyWatching,
  type InsertCurrentlyWatching,
  type WatchSession,
  type InsertWatchSession,
  type Rating,
  type CustomList,
  type CustomListItem,
  type Friendship,
  type Activity,
  type ActivityLike,
  type ActivityComment,
  type UserAchievement,
  type WatchGoal,
  type EmailVerificationToken,
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

  // Custom Lists
  getCustomLists(userId: number): Promise<CustomList[]>;
  createCustomList(userId: number, data: { name: string; description?: string; isPublic?: boolean }): Promise<CustomList>;
  deleteCustomList(userId: number, listId: number): Promise<void>;
  getCustomListItems(listId: number): Promise<CustomListItem[]>;
  addItemToCustomList(listId: number, item: { mediaId: string; title: string; type: string; posterUrl?: string }): Promise<CustomListItem>;
  removeItemFromCustomList(listId: number, mediaId: string): Promise<void>;

  // Email Verification
  createVerificationToken(userId: number, token: string, expiresAt: Date): Promise<EmailVerificationToken>;
  getVerificationToken(token: string): Promise<EmailVerificationToken | undefined>;
  deleteVerificationToken(id: number): Promise<void>;
  markEmailVerified(userId: number): Promise<void>;
  getUserByEmail(email: string): Promise<User | undefined>;

  // Activity Feed
  createActivity(userId: number, data: Omit<Activity, 'id' | 'userId' | 'createdAt'>): Promise<Activity>;
  getFeedActivities(userId: number, limit?: number): Promise<(Activity & { user: Pick<User,'id'|'username'|'avatarUrl'>; likeCount: number; commentCount: number; likedByMe: boolean })[]>;
  getMyActivities(userId: number, limit?: number): Promise<Activity[]>;
  toggleActivityLike(activityId: number, userId: number): Promise<{ liked: boolean; count: number }>;
  getActivityComments(activityId: number): Promise<(ActivityComment & { user: Pick<User,'id'|'username'|'avatarUrl'> })[]>;
  addActivityComment(activityId: number, userId: number, body: string): Promise<ActivityComment>;
  deleteActivityComment(commentId: number, userId: number): Promise<void>;

  // Achievements
  getUserAchievements(userId: number): Promise<UserAchievement[]>;
  awardAchievement(userId: number, key: string): Promise<UserAchievement | null>;

  // Watch Goals
  getWatchGoals(userId: number): Promise<WatchGoal[]>;
  setWatchGoal(userId: number, data: { type: string; target: number; year: number }): Promise<WatchGoal>;
  deleteWatchGoal(goalId: number, userId: number): Promise<void>;

  // Watch Streak
  getWatchStreak(userId: number): Promise<number>;

  // Taste match
  getTasteMatch(userId: number, friendId: number): Promise<number>;

  // Friends
  sendFriendRequest(requesterId: number, receiverId: number): Promise<Friendship>;
  getFriends(userId: number): Promise<(User & { friendshipId: number })[]>;
  getPendingFriendRequests(userId: number): Promise<(Friendship & { requester: User })[]>;
  acceptFriendRequest(friendshipId: number, userId: number): Promise<Friendship>;
  rejectFriendRequest(friendshipId: number, userId: number): Promise<void>;
  removeFriend(friendshipId: number, userId: number): Promise<void>;
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
    const baseSelect = db
      .select({
        id: watchSessions.id,
        startTime: sql<string>`to_char(${watchSessions.startTime}, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
        duration: sql<number>`COALESCE(${watchSessions.duration}, 0)`,
        title: currentlyWatching.title,
      })
      .from(watchSessions)
      .innerJoin(
        currentlyWatching,
        eq(watchSessions.watchlistId, currentlyWatching.id)
      );

    if (mediaId) {
      return baseSelect
        .where(and(eq(watchSessions.userId, userId), eq(currentlyWatching.mediaId, mediaId)))
        .orderBy(desc(watchSessions.startTime))
        .limit(10);
    }

    return baseSelect
      .where(eq(watchSessions.userId, userId))
      .orderBy(desc(watchSessions.startTime))
      .limit(10);
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

  // ---- Custom Lists ----

  async getCustomLists(userId: number): Promise<CustomList[]> {
    return db
      .select()
      .from(customLists)
      .where(eq(customLists.userId, userId))
      .orderBy(desc(customLists.createdAt));
  }

  async createCustomList(
    userId: number,
    data: { name: string; description?: string; isPublic?: boolean }
  ): Promise<CustomList> {
    const [list] = await db
      .insert(customLists)
      .values({ userId, name: data.name, description: data.description, isPublic: data.isPublic ?? false })
      .returning();
    return list;
  }

  async deleteCustomList(userId: number, listId: number): Promise<void> {
    // Delete items first
    await db.delete(customListItems).where(eq(customListItems.listId, listId));
    await db
      .delete(customLists)
      .where(and(eq(customLists.id, listId), eq(customLists.userId, userId)));
  }

  async getCustomListItems(listId: number): Promise<CustomListItem[]> {
    return db
      .select()
      .from(customListItems)
      .where(eq(customListItems.listId, listId))
      .orderBy(desc(customListItems.addedAt));
  }

  async addItemToCustomList(
    listId: number,
    item: { mediaId: string; title: string; type: string; posterUrl?: string }
  ): Promise<CustomListItem> {
    const [created] = await db
      .insert(customListItems)
      .values({ listId, ...item })
      .returning();
    return created;
  }

  async removeItemFromCustomList(listId: number, mediaId: string): Promise<void> {
    await db
      .delete(customListItems)
      .where(and(eq(customListItems.listId, listId), eq(customListItems.mediaId, mediaId)));
  }

  // ---- Friends ----

  async sendFriendRequest(requesterId: number, receiverId: number): Promise<Friendship> {
    const [friendship] = await db
      .insert(friendships)
      .values({ requesterId, receiverId, status: "pending" })
      .returning();
    return friendship;
  }

  async getFriends(userId: number): Promise<(User & { friendshipId: number })[]> {
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        password: users.password,
        email: users.email,
        emailVerified: users.emailVerified,
        avatarUrl: users.avatarUrl,
        preferences: users.preferences,
        createdAt: users.createdAt,
        friendshipId: friendships.id,
      })
      .from(friendships)
      .innerJoin(
        users,
        sql`(${friendships.requesterId} = ${userId} AND ${users.id} = ${friendships.receiverId})
         OR (${friendships.receiverId} = ${userId} AND ${users.id} = ${friendships.requesterId})`
      )
      .where(
        and(
          eq(friendships.status, "accepted"),
          sql`(${friendships.requesterId} = ${userId} OR ${friendships.receiverId} = ${userId})`
        )
      );
    return rows;
  }

  async getPendingFriendRequests(userId: number): Promise<(Friendship & { requester: User })[]> {
    const rows = await db
      .select({
        id: friendships.id,
        requesterId: friendships.requesterId,
        receiverId: friendships.receiverId,
        status: friendships.status,
        createdAt: friendships.createdAt,
        updatedAt: friendships.updatedAt,
        requester: {
          id: users.id,
          username: users.username,
          password: users.password,
          email: users.email,
          emailVerified: users.emailVerified,
          avatarUrl: users.avatarUrl,
          preferences: users.preferences,
          createdAt: users.createdAt,
        },
      })
      .from(friendships)
      .innerJoin(users, eq(users.id, friendships.requesterId))
      .where(
        and(
          eq(friendships.receiverId, userId),
          eq(friendships.status, "pending")
        )
      );
    return rows as (Friendship & { requester: User })[];
  }

  async acceptFriendRequest(friendshipId: number, userId: number): Promise<Friendship> {
    const [updated] = await db
      .update(friendships)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(and(eq(friendships.id, friendshipId), eq(friendships.receiverId, userId)))
      .returning();
    if (!updated) throw new Error("Friend request not found");
    return updated;
  }

  async rejectFriendRequest(friendshipId: number, userId: number): Promise<void> {
    await db
      .update(friendships)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(and(eq(friendships.id, friendshipId), eq(friendships.receiverId, userId)));
  }

  async removeFriend(friendshipId: number, userId: number): Promise<void> {
    await db
      .delete(friendships)
      .where(
        and(
          eq(friendships.id, friendshipId),
          sql`(${friendships.requesterId} = ${userId} OR ${friendships.receiverId} = ${userId})`
        )
      );
  }

  // ---- Email Verification ----

  async createVerificationToken(userId: number, token: string, expiresAt: Date): Promise<EmailVerificationToken> {
    const [row] = await db.insert(emailVerificationTokens).values({ userId, token, expiresAt }).returning();
    return row;
  }

  async getVerificationToken(token: string): Promise<EmailVerificationToken | undefined> {
    const [row] = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.token, token));
    return row;
  }

  async deleteVerificationToken(id: number): Promise<void> {
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.id, id));
  }

  async markEmailVerified(userId: number): Promise<void> {
    await db.update(users).set({ emailVerified: true }).where(eq(users.id, userId));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  // ---- Activity Feed ----

  async createActivity(userId: number, data: Omit<Activity, 'id' | 'userId' | 'createdAt'>): Promise<Activity> {
    const [activity] = await db.insert(activities).values({ userId, ...data }).returning();
    return activity;
  }

  async getFeedActivities(userId: number, limit = 40): Promise<(Activity & { user: Pick<User,'id'|'username'|'avatarUrl'>; likeCount: number; commentCount: number; likedByMe: boolean })[]> {
    // Get friend ids
    const friendRows = await db
      .select({ friendId: sql<number>`CASE WHEN ${friendships.requesterId} = ${userId} THEN ${friendships.receiverId} ELSE ${friendships.requesterId} END` })
      .from(friendships)
      .where(and(eq(friendships.status, 'accepted'), sql`(${friendships.requesterId} = ${userId} OR ${friendships.receiverId} = ${userId})`));
    const friendIds = [userId, ...friendRows.map(r => r.friendId)];

    const rows = await db
      .select({
        activity: activities,
        user: { id: users.id, username: users.username, avatarUrl: users.avatarUrl },
        likeCount: sql<number>`(SELECT COUNT(*) FROM activity_likes WHERE activity_id = ${activities.id})`,
        commentCount: sql<number>`(SELECT COUNT(*) FROM activity_comments WHERE activity_id = ${activities.id})`,
        likedByMe: sql<boolean>`EXISTS(SELECT 1 FROM activity_likes WHERE activity_id = ${activities.id} AND user_id = ${userId})`,
      })
      .from(activities)
      .innerJoin(users, eq(users.id, activities.userId))
      .where(sql`${activities.userId} = ANY(ARRAY[${sql.join(friendIds.map(id => sql`${id}`), sql`, `)}]::int[])`)
      .orderBy(desc(activities.createdAt))
      .limit(limit);

    return rows.map(r => ({ ...r.activity, user: r.user, likeCount: Number(r.likeCount), commentCount: Number(r.commentCount), likedByMe: Boolean(r.likedByMe) }));
  }

  async getMyActivities(userId: number, limit = 20): Promise<Activity[]> {
    return db.select().from(activities).where(eq(activities.userId, userId)).orderBy(desc(activities.createdAt)).limit(limit);
  }

  async toggleActivityLike(activityId: number, userId: number): Promise<{ liked: boolean; count: number }> {
    const [existing] = await db.select().from(activityLikes).where(and(eq(activityLikes.activityId, activityId), eq(activityLikes.userId, userId)));
    if (existing) {
      await db.delete(activityLikes).where(eq(activityLikes.id, existing.id));
    } else {
      await db.insert(activityLikes).values({ activityId, userId });
    }
    const [{ count }] = await db.select({ count: sql<number>`COUNT(*)` }).from(activityLikes).where(eq(activityLikes.activityId, activityId));
    return { liked: !existing, count: Number(count) };
  }

  async getActivityComments(activityId: number): Promise<(ActivityComment & { user: Pick<User,'id'|'username'|'avatarUrl'> })[]> {
    const rows = await db
      .select({ comment: activityComments, user: { id: users.id, username: users.username, avatarUrl: users.avatarUrl } })
      .from(activityComments)
      .innerJoin(users, eq(users.id, activityComments.userId))
      .where(eq(activityComments.activityId, activityId))
      .orderBy(activityComments.createdAt);
    return rows.map(r => ({ ...r.comment, user: r.user }));
  }

  async addActivityComment(activityId: number, userId: number, body: string): Promise<ActivityComment> {
    const [comment] = await db.insert(activityComments).values({ activityId, userId, body }).returning();
    return comment;
  }

  async deleteActivityComment(commentId: number, userId: number): Promise<void> {
    await db.delete(activityComments).where(and(eq(activityComments.id, commentId), eq(activityComments.userId, userId)));
  }

  // ---- Achievements ----

  async getUserAchievements(userId: number): Promise<UserAchievement[]> {
    return db.select().from(userAchievements).where(eq(userAchievements.userId, userId)).orderBy(userAchievements.earnedAt);
  }

  async awardAchievement(userId: number, key: string): Promise<UserAchievement | null> {
    const [existing] = await db.select().from(userAchievements).where(and(eq(userAchievements.userId, userId), eq(userAchievements.achievementKey, key)));
    if (existing) return null;
    const [created] = await db.insert(userAchievements).values({ userId, achievementKey: key }).returning();
    return created;
  }

  // ---- Watch Goals ----

  async getWatchGoals(userId: number): Promise<WatchGoal[]> {
    return db.select().from(watchGoals).where(eq(watchGoals.userId, userId));
  }

  async setWatchGoal(userId: number, data: { type: string; target: number; year: number }): Promise<WatchGoal> {
    const [existing] = await db.select().from(watchGoals).where(and(eq(watchGoals.userId, userId), eq(watchGoals.type, data.type), eq(watchGoals.year, data.year)));
    if (existing) {
      const [updated] = await db.update(watchGoals).set({ target: data.target }).where(eq(watchGoals.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(watchGoals).values({ userId, ...data }).returning();
    return created;
  }

  async deleteWatchGoal(goalId: number, userId: number): Promise<void> {
    await db.delete(watchGoals).where(and(eq(watchGoals.id, goalId), eq(watchGoals.userId, userId)));
  }

  // ---- Watch Streak ----

  async getWatchStreak(userId: number): Promise<number> {
    const sessions = await db
      .select({ date: sql<string>`DATE(${watchSessions.startTime})` })
      .from(watchSessions)
      .where(eq(watchSessions.userId, userId))
      .orderBy(desc(watchSessions.startTime));

    const days = Array.from(new Set(sessions.map(s => s.date)));
    if (!days.length) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < days.length; i++) {
      const d = new Date(days[i]);
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);
      if (d.toDateString() === expected.toDateString()) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  // ---- Taste Match ----

  async getTasteMatch(userId: number, friendId: number): Promise<number> {
    const myCompleted = await db.select({ mediaId: watchlist.mediaId }).from(watchlist)
      .where(and(eq(watchlist.userId, userId), eq(watchlist.status, 'completed')));
    const friendCompleted = await db.select({ mediaId: watchlist.mediaId }).from(watchlist)
      .where(and(eq(watchlist.userId, friendId), eq(watchlist.status, 'completed')));

    const myIds = new Set(myCompleted.map(r => r.mediaId));
    const friendIds = new Set(friendCompleted.map(r => r.mediaId));
    if (!myIds.size || !friendIds.size) return 0;

    const myArr = Array.from(myIds);
    const shared = myArr.filter(id => friendIds.has(id)).length;
    const union = new Set([...Array.from(myIds), ...Array.from(friendIds)]).size;
    return Math.round((shared / union) * 100);
  }
}

export const storage = new DatabaseStorage();