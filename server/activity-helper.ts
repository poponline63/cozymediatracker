/**
 * Activity & Achievement helper
 * Call these after successful media operations to auto-log activities
 * and award achievements.
 */

import { storage } from "./storage";

export type ActivityType =
  | "started_watching"
  | "completed"
  | "rated"
  | "added_to_list"
  | "added_to_watchlist";

export async function logActivity(
  userId: number,
  type: ActivityType,
  media: {
    mediaId?: string | null;
    mediaTitle?: string | null;
    mediaType?: string | null;
    posterUrl?: string | null;
  },
  metadata: Record<string, unknown> = {}
) {
  try {
    await storage.createActivity(userId, {
      type,
      mediaId: media.mediaId ?? null,
      mediaTitle: media.mediaTitle ?? null,
      mediaType: media.mediaType ?? null,
      posterUrl: media.posterUrl ?? null,
      metadata,
    });
  } catch {
    // Non-fatal — never block main action
  }
}

// Achievement definitions
const ACHIEVEMENTS: Record<string, { label: string; description: string; emoji: string }> = {
  first_watch:      { emoji: "🎬", label: "First Watch",        description: "Started watching your first title" },
  first_complete:   { emoji: "✅", label: "First Completion",   description: "Completed your first movie or show" },
  binge_watcher:    { emoji: "📺", label: "Binge Watcher",      description: "Completed 5 titles" },
  cinephile:        { emoji: "🎥", label: "Cinephile",          description: "Completed 20 titles" },
  first_rating:     { emoji: "⭐", label: "Critic",             description: "Rated your first title" },
  five_star:        { emoji: "🌟", label: "Five Star Fan",      description: "Gave a 5-star rating" },
  first_list:       { emoji: "📋", label: "List Maker",         description: "Created your first custom list" },
  social_butterfly: { emoji: "🦋", label: "Social Butterfly",  description: "Added your first friend" },
  streak_3:         { emoji: "🔥", label: "On a Roll",          description: "3-day watch streak" },
  streak_7:         { emoji: "🚀", label: "Week Warrior",       description: "7-day watch streak" },
  night_owl:        { emoji: "🦉", label: "Night Owl",          description: "Watched something after midnight" },
};

export const ACHIEVEMENT_CATALOG = ACHIEVEMENTS;

export async function checkAndAwardAchievements(
  userId: number,
  trigger: {
    type: ActivityType;
    rating?: number;
    totalCompleted?: number;
    friendAdded?: boolean;
    listCreated?: boolean;
    streak?: number;
  }
) {
  const awards: string[] = [];

  const award = async (key: string) => {
    const result = await storage.awardAchievement(userId, key);
    if (result) awards.push(key);
  };

  if (trigger.type === "started_watching") {
    const my = await storage.getMyActivities(userId, 1);
    if (my.length <= 1) await award("first_watch");

    // Night owl check
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) await award("night_owl");
  }

  if (trigger.type === "completed") {
    await award("first_complete");
    const count = trigger.totalCompleted ?? 0;
    if (count >= 5)  await award("binge_watcher");
    if (count >= 20) await award("cinephile");
  }

  if (trigger.type === "rated") {
    await award("first_rating");
    if (trigger.rating === 5) await award("five_star");
  }

  if (trigger.type === "added_to_list" && trigger.listCreated) {
    await award("first_list");
  }

  if (trigger.friendAdded) {
    await award("social_butterfly");
  }

  if (trigger.streak) {
    if (trigger.streak >= 3) await award("streak_3");
    if (trigger.streak >= 7) await award("streak_7");
  }

  return awards;
}
