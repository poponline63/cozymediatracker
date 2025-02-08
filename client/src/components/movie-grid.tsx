import { Loader2, Play } from "lucide-react";
import MediaCard from "./media-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Watchlist } from "@shared/schema";

interface MovieGridProps {
  items: any[];
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

  const startWatchingMutation = useMutation({
    mutationFn: async (watchlistId: number) => {
      const res = await apiRequest("PATCH", `/api/watchlist/${watchlistId}`, {
        status: "watching"
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: (data, watchlistId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/currently-watching"] });
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      const item = items.find(item => item.id === watchlistId);
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
          (w) => w.mediaId === (item.imdbID || item.mediaId)
        );

        return (
          <div key={item.imdbID || item.id} className="space-y-2">
            <div
              className="cursor-pointer"
              onClick={() => onItemClick?.(item.imdbID || item.mediaId)}
            >
              <MediaCard
                id={item.imdbID || item.mediaId}
                title={item.Title || item.title}
                posterUrl={item.Poster || item.posterUrl}
                type={item.Type || item.type}
                showAddToList={!watchlistItem && showAddToList}
                showProgress={showProgress}
                showRemove={showRemove}
                progress={item.progress}
                watchlistId={watchlistItem?.id}
                status={watchlistItem?.status}
              />
            </div>
            {item.status === "plan_to_watch" && (
              <Button
                className="w-full"
                size="sm"
                onClick={() => startWatchingMutation.mutate(item.id)}
                disabled={startWatchingMutation.isPending}
              >
                <Play className="w-4 h-4 mr-2" />
                Start Watching
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}