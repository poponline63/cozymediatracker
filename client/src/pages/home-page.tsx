import { useQuery } from "@tanstack/react-query";
import { BarChart3, User } from "lucide-react";
import type { Watchlist } from "@shared/schema";
import MovieGrid from "@/components/movie-grid";

export default function HomePage() {
  const { data: watchlist, isLoading } = useQuery<Watchlist[]>({
    queryKey: ["/api/watchlist"],
  });

  const watching = watchlist?.filter((item) => item.status === "watching") || [];

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <User className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-semibold">My Profile</h1>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h2 className="text-lg font-semibold">Your Media Progress</h2>
        </div>

        <div className="bg-blue-50/10 rounded-lg p-4">
          <p className="text-muted-foreground">
            Add some shows or movies to start tracking!
          </p>
        </div>

        {watching.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">Currently Watching</h3>
            <MovieGrid
              items={watching}
              isLoading={isLoading}
              showProgress
              showRemove
            />
          </div>
        )}
      </div>
    </div>
  );
}