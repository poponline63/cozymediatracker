import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X, Eye, Star, Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type InsertWatchlist } from "@shared/schema";
import WatchProgress from "./watch-progress";
import { Link } from "wouter";

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
  rating?: number;
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
  rating,
}: MediaCardProps) {
  const { toast } = useToast();

  const addMutation = useMutation({
    mutationFn: async (data: InsertWatchlist) => {
      const res = await apiRequest("POST", "/api/watchlist", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add to watchlist");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Added to watchlist",
        description: `${title} has been added to your watchlist. View it in your profile.`,
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

  const removeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/watchlist/${id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to remove from watchlist");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Removed from watchlist",
        description: `${title} has been removed from your watchlist`,
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

  const moveToWatchingMutation = useMutation({
    mutationFn: async (watchlistId: number) => {
      const res = await apiRequest("PATCH", `/api/watchlist/${watchlistId}`, {
        status: "watching",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to move to currently watching");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/currently-watching"] });
      toast({
        title: "Started watching",
        description: `${title} has been moved to your currently watching list`,
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

          {showProgress && progress !== undefined && (
            <WatchProgress
              watchlistId={watchlistId!}
              mediaId={id}
              currentProgress={progress}
              type={type}
            />
          )}

          {!showRemove && (
            <div className="flex items-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  key={star}
                  variant="ghost"
                  size="sm"
                  className="p-0 h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    //rateMutation.mutate({ mediaId: id, rating: star });
                  }}
                  disabled={false}
                >
                  <Star
                    className={`h-4 w-4 ${
                      (rating || 0) >= star ? "fill-primary text-primary" : "text-muted-foreground"
                    }`}
                  />
                </Button>
              ))}
            </div>
          )}

          {showAddToList && (
            <div className="space-y-2 mt-2">
              {watchlistId ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  asChild
                >
                  <Link href="/profile" className="flex items-center justify-center">
                    <User className="h-4 w-4 mr-2" />
                    View in Profile
                  </Link>
                </Button>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      addMutation.mutate({
                        mediaId: id,
                        title,
                        type,
                        posterUrl: posterUrl || null,
                        status: "plan_to_watch",
                      });
                    }}
                    disabled={addMutation.isPending}
                  >
                    {addMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Add to Watchlist
                  </Button>
                </>
              )}
            </div>
          )}

          {status === "plan_to_watch" && watchlistId && !showAddToList && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full mt-2"
              asChild
            >
              <Link href="/profile" className="flex items-center justify-center">
                <User className="h-4 w-4 mr-2" />
                View in Profile
              </Link>
            </Button>
          )}
        </div>

        {showRemove && watchlistId && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              removeMutation.mutate(watchlistId);
            }}
            disabled={removeMutation.isPending}
          >
            {removeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}