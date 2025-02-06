import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWatchlistSchema } from "@shared/schema";

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

  // OMDB Proxy
  app.get("/api/search", async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).send("Query is required");

    const result = await fetch(
      `http://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&s=${query}`,
    );
    const data = await result.json();
    res.json(data);
  });

  app.get("/api/media/:id", async (req, res) => {
    try {
      // Fetch basic details
      const result = await fetch(
        `http://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&i=${req.params.id}&plot=full`,
      );

      if (!result.ok) {
        throw new Error('Failed to fetch from OMDB API');
      }

      const data = await result.json();

      // If it's a series, fetch episode information
      if (data.Type === "series") {
        const seasonsResult = await fetch(
          `http://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&i=${req.params.id}&Season=1`,
        );

        if (seasonsResult.ok) {
          const seasonsData = await seasonsResult.json();
          data.Episodes = seasonsData.Episodes;
        }
      }

      res.json(data);
    } catch (error) {
      console.error('Error fetching media details:', error);
      res.status(500).json({ error: 'Failed to fetch media details' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}