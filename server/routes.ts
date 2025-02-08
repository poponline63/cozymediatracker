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

  app.get("/api/currently-watching/:mediaId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const item = await storage.getCurrentlyWatchingByMediaId(req.user!.id, req.params.mediaId);
    res.json({ watchingItem: item });
  });

  app.post("/api/currently-watching", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parsed = insertCurrentlyWatchingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    // Check if media already exists in currently watching
    const existingCurrentlyWatching = await storage.getCurrentlyWatchingByMediaId(req.user!.id, parsed.data.mediaId);
    if (existingCurrentlyWatching) {
      return res.status(400).json({ message: "This media is already in your currently watching list" });
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

  app.get("/api/watchlist/:mediaId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const item = await storage.getWatchlistByMediaId(req.user!.id, req.params.mediaId);
    res.json({ watchlistItem: item });
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

    try {
      const watchlistItem = await storage.getWatchlistItem(parseInt(req.params.id));
      if (!watchlistItem) {
        return res.status(404).json({ message: "Watchlist item not found" });
      }

      if (req.body.status === "watching") {
        // Move to currently watching
        const watching = await storage.startWatching(req.user!.id, {
          mediaId: watchlistItem.mediaId,
          title: watchlistItem.title,
          type: watchlistItem.type,
          posterUrl: watchlistItem.posterUrl,
        });
        // Remove from watchlist after successful transition
        await storage.removeFromWatchlist(parseInt(req.params.id));
        res.json({ status: "moved_to_watching", watching });
      } else {
        res.status(400).json({ message: "Invalid status update" });
      }
    } catch (error) {
      console.error("Error updating watchlist status:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
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

  // Statistics routes
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

  app.post("/api/watch-sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const session = await storage.createWatchSession(req.user!.id, req.body);
    res.status(201).json(session);
  });

  app.patch("/api/currently-watching/:id/move-to-watchlist", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const currentlyWatching = await storage.getCurrentlyWatchingItem(parseInt(req.params.id));
      if (!currentlyWatching) {
        return res.status(404).json({ message: "Currently watching item not found" });
      }

      // Add to watchlist
      const watchlist = await storage.addToWatchlist(req.user!.id, {
        mediaId: currentlyWatching.mediaId,
        title: currentlyWatching.title,
        type: currentlyWatching.type,
        posterUrl: currentlyWatching.posterUrl,
        status: "plan_to_watch",
      });

      // Remove from currently watching
      await storage.stopWatching(parseInt(req.params.id));

      res.json({ status: "moved_to_watchlist", watchlist });
    } catch (error) {
      console.error("Error moving to watchlist:", error);
      res.status(500).json({ message: "Failed to move to watchlist" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}