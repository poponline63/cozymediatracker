import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import MovieGrid from "@/components/movie-grid";
import Layout from "@/components/layout";
import type { Watchlist } from "@shared/schema";

export default function ProfilePage() {
  const { data: watchlist, isLoading } = useQuery<Watchlist[]>({
    queryKey: ["/api/watchlist"],
  });

  const watching = watchlist?.filter((item) => item.status === "watching") || [];
  const planToWatch = watchlist?.filter((item) => item.status === "plan_to_watch") || [];

  return (
    <Layout>
      <div className="max-w-screen-2xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">My Watchlist</h2>
          <p className="text-muted-foreground">
            {watchlist?.length || 0} items in watchlist
          </p>
        </div>

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