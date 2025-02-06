import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import MovieGrid from "@/components/movie-grid";
import Layout from "@/components/layout";
import type { Watchlist } from "@shared/schema";
import { Progress } from "@/components/ui/progress";

export default function ProfilePage() {
  const { data: watchlist, isLoading } = useQuery<Watchlist[]>({
    queryKey: ["/api/watchlist"],
  });

  const watching = watchlist?.filter((item) => item.status === "watching") || [];
  const planToWatch = watchlist?.filter((item) => item.status === "plan_to_watch") || [];

  // Calculate completion statistics
  const totalItems = watching.length;
  const itemsWithProgress = watching.filter(item => item.progress && item.progress > 0).length;
  const completionPercentage = totalItems > 0 ? (itemsWithProgress / totalItems) * 100 : 0;

  return (
    <Layout>
      <div className="max-w-screen-2xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">My Watchlist</h2>
          <p className="text-muted-foreground">
            {watchlist?.length || 0} items in watchlist
          </p>
        </div>

        {watching.length > 0 && (
          <div className="mb-8 p-4 border rounded-lg bg-card">
            <h3 className="font-semibold mb-2">Watch Progress</h3>
            <div className="space-y-2">
              <Progress value={completionPercentage} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {itemsWithProgress} out of {totalItems} shows/movies in progress
              </p>
            </div>
          </div>
        )}

        <Tabs defaultValue="watching" className="space-y-4">
          <TabsList>
            <TabsTrigger value="watching">
              Watching ({watching.length})
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
      </div>
    </Layout>
  );
}