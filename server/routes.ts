import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertWatchlistSchema } from "@shared/schema";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Watchlist routes
  app.get("/api/watchlist", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const items = await storage.getWatchlist(req.user.id);
    res.json(items);
  });

  app.post("/api/watchlist", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    
    const parsed = insertWatchlistSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    
    const item = await storage.addToWatchlist(req.user.id, parsed.data);
    res.status(201).json(item);
  });

  app.patch("/api/watchlist/:id", async (req, res) => {
    if (!req.user) return res.sendStatus(401);
    
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
    if (!req.user) return res.sendStatus(401);
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
    const result = await fetch(
      `http://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&i=${req.params.id}`,
    );
    const data = await result.json();
    res.json(data);
  });

  const httpServer = createServer(app);
  return httpServer;
}
