import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clock, Eye } from "lucide-react";
import MediaCard from "./media-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Watchlist } from "@shared/schema";

interface MovieGridItem {
  id: string;
  mediaId: string;
  title: string;
  type: string;
  posterUrl?: string;
  progress?: number;
  status?: string;
  rating?: number;
  watchlistId?: number;
}

interface MovieGridProps {
  items: MovieGridItem[];
  isLoading: boolean;
  showAddToList?: boolean;
  showProgress?: boolean;
  showRemove?: boolean;
  onItemClick?: (id: string) => void;
}

export default function MovieGrid({
  items,
  isLoading,
  showAddToList,
  showProgress,
  showRemove,
  onItemClick,
}: MovieGridProps) {
  const { toast } = useToast();

  const { data: watchlist } = useQuery<Watchlist[]>({
    queryKey: ["/api/watchlist"],
  });

  // Move to watchlist mutation
  const moveToWatchlistMutation = useMutation({
    mutationFn: async (currentlyWatchingId: number) => {
      if (!currentlyWatchingId || isNaN(currentlyWatchingId)) {
        throw new Error("Invalid item ID");
      }

      console.log("Moving to watchlist:", currentlyWatchingId);
      const res = await apiRequest(
        "PATCH",
        `/api/currently-watching/${currentlyWatchingId}/move-to-watchlist`,
        {}
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to move item to watchlist");
      }

      const data = await res.json();
      console.log("Move to watchlist response:", data);
      return data;
    },
    onSuccess: (_, currentlyWatchingId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/currently-watching"] });
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      const item = items.find((item) => item.id === currentlyWatchingId.toString());
      toast({
        title: "Moved to watchlist",
        description: `${item?.title} has been moved to your watchlist`,
      });
    },
    onError: (error: Error) => {
      console.error("Move to watchlist error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Start watching mutation
  const startWatchingMutation = useMutation({
    mutationFn: async (watchlistId: number) => {
      const res = await apiRequest("PATCH", `/api/watchlist/${watchlistId}`, {
        status: "watching",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to start watching");
      }
      return res.json();
    },
    onSuccess: (_, watchlistId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/currently-watching"] });
      const item = items.find((item) => item.watchlistId === watchlistId);
      toast({
        title: "Started watching",
        description: `${item?.title} has been moved to your currently watching list`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="w-full aspect-[2/3]" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No items found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {items.map((item) => {
        const watchlistItem = watchlist?.find(
          (w) => w.mediaId === item.mediaId
        );

        return (
          <div key={item.id} className="space-y-2">
            <div
              className="cursor-pointer"
              onClick={() => onItemClick?.(item.mediaId)}
            >
              <MediaCard
                id={item.mediaId}
                title={item.title}
                posterUrl={item.posterUrl}
                type={item.type}
                showAddToList={!watchlistItem && showAddToList}
                showProgress={showProgress}
                showRemove={showRemove}
                progress={item.progress}
                watchlistId={watchlistItem?.id}
                status={item.status}
                rating={item.rating}
              />
            </div>

            {/* Show "Start Watching" button in profile/watchlist view */}
            {watchlistItem && item.status === "plan_to_watch" && (
              <Button
                className="w-full"
                size="sm"
                variant="secondary"
                onClick={() => startWatchingMutation.mutate(watchlistItem.id)}
                disabled={startWatchingMutation.isPending}
              >
                <Eye className="w-4 h-4 mr-2" />
                Start Watching
              </Button>
            )}
            {/* Show "Move to Watchlist" button for currently watching items */}
            {item.status === "watching" && (
              <Button
                className="w-full"
                size="sm"
                variant="secondary"
                onClick={() => {
                  console.log("Attempting to move to watchlist:", item);
                  moveToWatchlistMutation.mutate(Number(item.id));
                }}
                disabled={moveToWatchlistMutation.isPending}
              >
                <Clock className="w-4 h-4 mr-2" />
                Move to Watchlist
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}