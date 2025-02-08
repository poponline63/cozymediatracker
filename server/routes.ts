import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWatchlistSchema, insertCurrentlyWatchingSchema } from "@shared/schema";

export function registerRoutes(app: Express): Server {
  // Currently Watching routes
  app.get("/api/currently-watching", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const items = await storage.getCurrentlyWatching(req.user!.id);
    res.json(items);
  });

  app.post("/api/currently-watching", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertCurrentlyWatchingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const item = await storage.startWatching(req.user!.id, parsed.data);

    // If the item was in the watchlist, remove it
    const existingWatchlist = await storage.getWatchlistByMediaId(req.user!.id, parsed.data.mediaId);
    if (existingWatchlist) {
      await storage.removeFromWatchlist(existingWatchlist.id);
    }

    res.status(201).json(item);
  });

  app.patch("/api/currently-watching/:id/progress", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { progress, currentSeason, currentEpisode } = req.body;
    if (typeof progress !== "number" || progress < 0 || progress > 100) {
      return res.status(400).json({ message: "Invalid progress value" });
    }

    try {
      const item = await storage.updateProgress(
        parseInt(req.params.id),
        progress,
        { currentSeason, currentEpisode }
      );
      res.json(item);
    } catch (error) {
      res.status(404).json({ message: "Currently watching item not found" });
    }
  });

  app.patch("/api/currently-watching/:id/complete", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const item = await storage.markAsCompleted(parseInt(req.params.id));
      res.json(item);
    } catch (error) {
      res.status(404).json({ message: "Currently watching item not found" });
    }
  });

  app.delete("/api/currently-watching/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      await storage.stopWatching(parseInt(req.params.id));
      res.sendStatus(204);
    } catch (error) {
      res.status(404).json({ message: "Currently watching item not found" });
    }
  });

  // Watchlist routes
  app.get("/api/watchlist", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const items = await storage.getWatchlist(req.user!.id);
    res.json(items);
  });

  app.post("/api/watchlist", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertWatchlistSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    // Check if media already exists in user's watchlist or currently watching
    const existingWatchlist = await storage.getWatchlistByMediaId(req.user!.id, parsed.data.mediaId);
    const existingCurrentlyWatching = await storage.getCurrentlyWatchingByMediaId(req.user!.id, parsed.data.mediaId);
    if (existingWatchlist) {
      return res.status(400).json({ message: "This media is already in your watchlist" });
    }
    if (existingCurrentlyWatching) {
      return res.status(400).json({ message: "This media is already in your currently watching list" });
    }

    const item = await storage.addToWatchlist(req.user!.id, parsed.data);
    res.status(201).json(item);
  });

  app.patch("/api/watchlist/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { status, progress } = req.body;
    if (!status) return res.status(400).send("Status is required");

    const item = await storage.updateWatchlistStatus(
      parseInt(req.params.id),
      status,
      progress,
    );
    res.json(item);
  });

  app.delete("/api/watchlist/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.removeFromWatchlist(parseInt(req.params.id));
    res.sendStatus(204);
  });

  // OMDB Proxy with caching
  app.get("/api/search", async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).send("Query is required");

    const result = await fetch(
      `http://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&s=${query}`,
    );
    const data = await result.json();

    // Add cache headers
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.json(data);
  });

  app.get("/api/media/:id", async (req, res) => {
    try {
      const season = req.query.season || "1";

      // Fetch basic details first
      const result = await fetch(
        `http://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&i=${req.params.id}&plot=full`,
      );

      if (!result.ok) {
        throw new Error('Failed to fetch from OMDB API');
      }

      const data = await result.json();

      // If it's a series, fetch season information
      if (data.Type === "series") {
        const seasonsResult = await fetch(
          `http://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&i=${req.params.id}&Season=${season}`,
        );

        if (seasonsResult.ok) {
          const seasonsData = await seasonsResult.json();
          data.Episodes = seasonsData.Episodes?.map((episode: any) => ({
            imdbID: episode.imdbID,
            Title: episode.Title,
            Released: episode.Released,
            Episode: episode.Episode,
            imdbRating: episode.imdbRating,
          }));
        }
      }

      // Add cache headers
      res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      res.json(data);
    } catch (error) {
      console.error('Error fetching media details:', error);
      res.status(500).json({ error: 'Failed to fetch media details' });
    }
  });

  // Custom Lists routes
  app.get("/api/custom-lists", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const lists = await storage.getCustomLists(req.user!.id);
    res.json(lists);
  });

  app.post("/api/custom-lists", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertCustomListSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const list = await storage.createCustomList(req.user!.id, parsed.data);
    res.status(201).json(list);
  });

  app.get("/api/custom-lists/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const list = await storage.getCustomList(parseInt(req.params.id));
    if (!list) return res.sendStatus(404);
    if (list.userId !== req.user!.id && !list.isPublic) {
      return res.sendStatus(403);
    }
    res.json(list);
  });

  app.post("/api/custom-lists/:id/items", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const listId = parseInt(req.params.id);
    const { mediaId, title, posterUrl } = req.body;

    const list = await storage.getCustomList(listId);
    if (!list) return res.sendStatus(404);
    if (list.userId !== req.user!.id) return res.sendStatus(403);

    const item = await storage.addToCustomList(listId, {
      mediaId,
      title,
      posterUrl,
    });
    res.status(201).json(item);
  });

  app.delete("/api/custom-lists/:listId/items/:itemId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const listId = parseInt(req.params.listId);
    const itemId = parseInt(req.params.itemId);

    const list = await storage.getCustomList(listId);
    if (!list) return res.sendStatus(404);
    if (list.userId !== req.user!.id) return res.sendStatus(403);

    await storage.removeFromCustomList(itemId);
    res.sendStatus(204);
  });

  // Update rating endpoint
  app.patch("/api/watchlist/:id/rating", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { rating } = req.body;
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Invalid rating" });
    }

    const item = await storage.updateWatchlistRating(
      parseInt(req.params.id),
      rating
    );
    res.json(item);
  });

  // Add statistics routes
  app.get("/api/statistics", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const stats = await storage.getUserStatistics(req.user!.id);
    res.json(stats);
  });

  app.get("/api/statistics/watch-sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const sessions = await storage.getRecentWatchSessions(req.user!.id);
    res.json(sessions);
  });

  // Add this to the routes registration
  app.post("/api/watch-sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const session = await storage.createWatchSession(req.user!.id, req.body);
    res.status(201).json(session);
  });

  // Add progress update endpoint
  app.patch("/api/watchlist/:id/progress", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { progress } = req.body;
    if (typeof progress !== "number" || progress < 0 || progress > 100) {
      return res.status(400).json({ message: "Invalid progress value" });
    }

    const item = await storage.updateWatchlistProgress(
      parseInt(req.params.id),
      progress
    );
    res.json(item);
  });

  const httpServer = createServer(app);
  return httpServer;
}