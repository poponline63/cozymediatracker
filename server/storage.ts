import { users, watchlist, type User, type InsertUser, type Watchlist, type InsertWatchlist } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Watchlist operations
  getWatchlist(userId: number): Promise<Watchlist[]>;
  addToWatchlist(userId: number, item: InsertWatchlist): Promise<Watchlist>;
  updateWatchlistStatus(id: number, status: string, progress?: number): Promise<Watchlist>;
  removeFromWatchlist(id: number): Promise<void>;

  sessionStore: ReturnType<typeof createMemoryStore>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private watchlistItems: Map<number, Watchlist>;
  private currentUserId: number;
  private currentWatchlistId: number;
  sessionStore: ReturnType<typeof createMemoryStore>;

  constructor() {
    this.users = new Map();
    this.watchlistItems = new Map();
    this.currentUserId = 1;
    this.currentWatchlistId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id, avatarUrl: insertUser.avatarUrl || null };
    this.users.set(id, user);
    return user;
  }

  async getWatchlist(userId: number): Promise<Watchlist[]> {
    return Array.from(this.watchlistItems.values()).filter(
      (item) => item.userId === userId,
    );
  }

  async addToWatchlist(userId: number, item: InsertWatchlist): Promise<Watchlist> {
    const id = this.currentWatchlistId++;
    const watchlistItem: Watchlist = {
      ...item,
      id,
      userId,
      addedAt: new Date(),
      progress: item.progress || null,
      posterUrl: item.posterUrl || null,
    };
    this.watchlistItems.set(id, watchlistItem);
    return watchlistItem;
  }

  async updateWatchlistStatus(
    id: number,
    status: string,
    progress?: number,
  ): Promise<Watchlist> {
    const item = this.watchlistItems.get(id);
    if (!item) throw new Error("Watchlist item not found");

    const updated = {
      ...item,
      status,
      progress: progress !== undefined ? progress : item.progress,
    };
    this.watchlistItems.set(id, updated);
    return updated;
  }

  async removeFromWatchlist(id: number): Promise<void> {
    this.watchlistItems.delete(id);
  }
}

export const storage = new MemStorage();