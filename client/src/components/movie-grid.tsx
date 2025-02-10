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

      try {
        const res = await apiRequest(
          "PATCH",
          `/api/currently-watching/${currentlyWatchingId}/move-to-watchlist`
        );

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Failed to move item to watchlist");
        }

        return res.json();
      } catch (error: any) {
        console.error("Move to watchlist error:", error);
        throw new Error(error.message || "Failed to move item to watchlist");
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/currently-watching"] });
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });

      toast({
        title: "Success",
        description: "Item moved to watchlist successfully",
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
            {item.status === "watching" && (
              <Button
                className="w-full"
                size="sm"
                variant="secondary"
                onClick={() => {
                  const id = parseInt(item.id);
                  if (!isNaN(id)) {
                    moveToWatchlistMutation.mutate(id);
                  } else {
                    toast({
                      title: "Error",
                      description: "Invalid item ID",
                      variant: "destructive",
                    });
                  }
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