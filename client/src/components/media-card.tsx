import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X, Eye, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type InsertWatchlist } from "@shared/schema";
import WatchProgress from "./watch-progress";

interface MediaCardProps {
  id: string;
  title: string;
  posterUrl?: string;
  type: string;
  showAddToList?: boolean;
  showProgress?: boolean;
  showRemove?: boolean;
  progress?: number;
  watchlistId?: number;
  status?: string;
}

export default function MediaCard({
  id,
  title,
  posterUrl,
  type,
  showAddToList,
  showProgress,
  showRemove,
  progress,
  watchlistId,
  status,
}: MediaCardProps) {
  const { toast } = useToast();

  const addMutation = useMutation({
    mutationFn: async (data: InsertWatchlist) => {
      const res = await apiRequest("POST", "/api/watchlist", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Added to watchlist",
        description: `${title} has been added to your watchlist`,
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/watchlist/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Removed from watchlist",
        description: `${title} has been removed from your watchlist`,
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/watchlist/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Status updated",
        description: `${title} has been moved to ${status === "watching" ? "Currently Watching" : "Plan to Watch"}`,
      });
    },
  });

  return (
    <Card className="overflow-hidden group relative">
      <CardContent className="p-0">
        <img
          src={posterUrl || "https://via.placeholder.com/300x450"}
          alt={title}
          className="w-full aspect-[2/3] object-cover"
        />
        <div className="p-4">
          <h3 className="font-semibold truncate">{title}</h3>
          <p className="text-sm text-muted-foreground capitalize">{type}</p>

          {showProgress && status === "watching" && (
            <WatchProgress
              watchlistId={watchlistId!}
              mediaId={id}
              currentProgress={progress}
              type={type}
            />
          )}

          {showAddToList && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full mt-2"
              onClick={() =>
                addMutation.mutate({
                  mediaId: id,
                  title,
                  type,
                  posterUrl,
                  status: "plan_to_watch",
                })
              }
              disabled={addMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add to Watchlist
            </Button>
          )}

          {watchlistId && !showAddToList && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full mt-2"
              onClick={() =>
                updateStatusMutation.mutate({
                  id: watchlistId,
                  status: status === "watching" ? "plan_to_watch" : "watching",
                })
              }
              disabled={updateStatusMutation.isPending}
            >
              {status === "watching" ? (
                <>
                  <Clock className="h-4 w-4 mr-1" />
                  Move to Plan to Watch
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  Move to Watching
                </>
              )}
            </Button>
          )}
        </div>

        {showRemove && watchlistId && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => removeMutation.mutate(watchlistId)}
            disabled={removeMutation.isPending}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}