import { useQuery } from "@tanstack/react-query";
import { BarChart3, User } from "lucide-react";
import type { Watchlist } from "@shared/schema";
import MovieGrid from "@/components/movie-grid";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Layout from "@/components/layout";
import Recommendations from "@/components/recommendations";

export default function HomePage() {
  const { data: watchlist, isLoading } = useQuery<Watchlist[]>({
    queryKey: ["/api/watchlist"],
  });

  const watching = watchlist?.filter((item) => item.status === "watching").map(item => ({
    id: item.id.toString(),
    mediaId: item.mediaId,
    title: item.title,
    type: item.type,
    status: "watching" as const,
    posterUrl: item.posterUrl || undefined,
    progress: item.progress ?? undefined,
    rating: item.rating ?? undefined,
    watchlistId: item.id
  })) || [];

  const planToWatch = watchlist?.filter((item) => item.status === "plan_to_watch").map(item => ({
    id: item.id.toString(),
    mediaId: item.mediaId,
    title: item.title,
    type: item.type,
    status: "plan_to_watch" as const,
    posterUrl: item.posterUrl || undefined,
    progress: item.progress ?? undefined,
    rating: item.rating ?? undefined,
    watchlistId: item.id
  })) || [];

  return (
    <Layout>
      <div className="p-4 space-y-6">
        <div className="flex items-center gap-3">
          <User className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-semibold">My Profile</h1>
        </div>

        {/* Add Recommendations section */}
        <Recommendations />

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h2 className="text-lg font-semibold">Your Media Progress</h2>
          </div>

          {!watchlist?.length ? (
            <div className="bg-blue-50/10 rounded-lg p-4">
              <p className="text-muted-foreground">
                Add some shows or movies to start tracking!
              </p>
            </div>
          ) : (
            <Tabs defaultValue="watching" className="space-y-4">
              <TabsList>
                <TabsTrigger value="watching">
                  Currently Watching ({watching.length})
                </TabsTrigger>
                <TabsTrigger value="plan_to_watch">
                  Plan to Watch ({planToWatch.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="watching" className="space-y-4">
                <MovieGrid
                  items={watching}
                  isLoading={isLoading}
                  showProgress
                  showRemove
                />
              </TabsContent>

              <TabsContent value="plan_to_watch" className="space-y-4">
                <MovieGrid
                  items={planToWatch}
                  isLoading={isLoading}
                  showProgress
                  showRemove
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </Layout>
  );
}