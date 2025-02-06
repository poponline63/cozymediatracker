import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import MovieGrid from "@/components/movie-grid";
import type { Watchlist } from "@shared/schema";

export default function ProfilePage() {
  const { data: watchlist, isLoading } = useQuery<Watchlist[]>({
    queryKey: ["/api/watchlist"],
  });

  const watching = watchlist?.filter((item) => item.status === "watching") || [];
  const planToWatch = watchlist?.filter((item) => item.status === "plan_to_watch") || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">My Watchlist</h1>
              <p className="text-muted-foreground">
                {watchlist?.length || 0} items in watchlist
              </p>
            </div>
          </div>
          <Link href="/">
            <Button variant="ghost">Back to Search</Button>
          </Link>
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
    </div>
  );
}