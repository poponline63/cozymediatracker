import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWatchlistSchema } from "@shared/schema";
import { insertCustomListSchema } from "@shared/schema";

export function registerRoutes(app: Express): Server {
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

    // Check if media already exists in user's watchlist
    const existing = await storage.getWatchlistByMediaId(req.user!.id, parsed.data.mediaId);
    if (existing) {
      return res.status(400).json({ message: "This media is already in your watchlist" });
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

  const httpServer = createServer(app);
  return httpServer;
}