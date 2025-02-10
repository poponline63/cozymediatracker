import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWatchlistSchema, insertCurrentlyWatchingSchema } from "@shared/schema";

export function registerRoutes(app: Express): Server {
  // Add the profile update route
  app.patch("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { username, password, avatarUrl } = req.body;

      // Check if username is already taken
      if (username !== req.user!.username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) {
          return res.status(400).json({ message: "Username already taken" });
        }
      }

      // Update user profile
      const updatedUser = await storage.updateUser(req.user!.id, {
        username,
        password,
        avatarUrl,
      });

      // Return updated user without password
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

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
      console.log(`Invalid progress value received: ${progress}`);
      return res.status(400).json({ message: "Invalid progress value" });
    }

    try {
      console.log(`Updating progress for ID ${req.params.id} to ${progress}%`);
      const item = await storage.updateProgress(
        parseInt(req.params.id),
        progress,
        { currentSeason, currentEpisode }
      );
      console.log(`Progress updated successfully for ${item.title}`);
      res.json(item);
    } catch (error) {
      console.error("Error updating progress:", error);
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
      const watchlistId = parseInt(req.params.id);
      if (isNaN(watchlistId)) {
        return res.status(400).json({ message: "Invalid watchlist ID" });
      }

      const watchlistItem = await storage.getWatchlistItem(watchlistId);
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
        await storage.removeFromWatchlist(watchlistId);
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

  // Update the watch sessions route to handle the enhanced functionality
  app.post("/api/watch-sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { mediaId, watchlistId, startTime, endTime, duration } = req.body;

      // Validate required fields
      if (!mediaId || !startTime || !endTime) {
        return res.status(400).json({
          message: "Missing required fields: mediaId, startTime, and endTime are required"
        });
      }

      // Ensure valid date objects
      const parsedStartTime = new Date(startTime);
      const parsedEndTime = new Date(endTime);

      if (isNaN(parsedStartTime.getTime()) || isNaN(parsedEndTime.getTime())) {
        return res.status(400).json({
          message: "Invalid date format for startTime or endTime"
        });
      }

      // Calculate duration if not provided
      const calculatedDuration = duration ||
        Math.floor((parsedEndTime.getTime() - parsedStartTime.getTime()) / 1000);

      // Create the watch session
      const session = await storage.createWatchSession(req.user!.id, {
        mediaId,
        watchlistId,
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        duration: calculatedDuration
      });

      console.log('Watch session created:', {
        userId: req.user!.id,
        mediaId,
        watchlistId,
        duration: session.duration,
      });

      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating watch session:", error);
      res.status(500).json({ message: "Failed to create watch session" });
    }
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

  // Recommendations route
  app.get("/api/recommendations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // Get user's completed items to base recommendations on
      const completedItems = await storage.getCompletedMedia(req.user!.id);

      // For now, return a simple list of popular items not in user's lists
      const recommendations = await storage.getRecommendations(req.user!.id);

      if (!recommendations.length) {
        return res.json([]);  // Return empty array if no recommendations
      }

      res.json(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  // Rating routes
  app.post("/api/ratings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { mediaId, rating } = req.body;
      if (typeof rating !== "number" || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }

      const ratingItem = await storage.upsertRating(req.user!.id, mediaId, rating);
      res.json(ratingItem);
    } catch (error) {
      console.error("Error rating media:", error);
      res.status(500).json({ message: "Failed to rate media" });
    }
  });

  app.post("/api/ratings/batch", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { mediaIds } = req.body;
      if (!Array.isArray(mediaIds)) {
        return res.status(400).json({ message: "mediaIds must be an array" });
      }

      const ratings = await storage.getRatingsByMediaIds(req.user!.id, mediaIds);
      // Convert array to object with mediaId as key
      const ratingsMap = ratings.reduce((acc, rating) => {
        acc[rating.mediaId] = rating.rating;
        return acc;
      }, {} as Record<string, number>);

      res.json(ratingsMap);
    } catch (error) {
      console.error("Error fetching ratings:", error);
      res.status(500).json({ message: "Failed to fetch ratings" });
    }
  });

  app.delete("/api/ratings/:mediaId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      await storage.deleteRating(req.user!.id, req.params.mediaId);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting rating:", error);
      res.status(500).json({ message: "Failed to delete rating" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}