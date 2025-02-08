import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Star, Plus, Play, Clock } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import WatchTimer from "./watch-timer";

interface MediaDetailsProps {
  mediaId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface CustomList {
  id: number;
  name: string;
}

export default function MediaDetails({
  mediaId,
  isOpen,
  onClose,
}: MediaDetailsProps) {
  const [currentSeason, setCurrentSeason] = useState("1");
  const { toast } = useToast();

  const { data: details, isLoading } = useQuery({
    queryKey: ["/api/media", mediaId, currentSeason],
    queryFn: async () => {
      const res = await fetch(`/api/media/${mediaId}?season=${currentSeason}`);
      if (!res.ok) {
        throw new Error('Failed to fetch media details');
      }
      return res.json();
    },
    enabled: isOpen && !!mediaId,
    staleTime: 1000 * 60 * 60, // Consider data fresh for 1 hour
  });

  const addToWatchlistMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/watchlist", {
        mediaId,
        title: details?.Title,
        type: details?.Type,
        posterUrl: details?.Poster,
        status: "plan_to_watch",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Added to watchlist",
        description: `${details?.Title} has been added to your watchlist`,
      });
    },
  });

  const startWatchingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/watchlist", {
        mediaId,
        title: details?.Title,
        type: details?.Type,
        posterUrl: details?.Poster,
        status: "watching",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Started watching",
        description: `${details?.Title} has been added to your currently watching list`,
      });
    },
  });

  const { data: customLists } = useQuery<CustomList[]>({
    queryKey: ["/api/custom-lists"],
  });

  const rateMutation = useMutation({
    mutationFn: async (rating: number) => {
      const res = await apiRequest("PATCH", `/api/watchlist/${mediaId}`, {
        rating,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Rating updated",
        description: "Your rating has been saved",
      });
    },
  });

  const addToListMutation = useMutation({
    mutationFn: async (listId: number) => {
      const res = await apiRequest("POST", `/api/custom-lists/${listId}/items`, {
        mediaId,
        title: details?.Title,
        posterUrl: details?.Poster,
      });
      return res.json();
    },
    onSuccess: (_, listId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-lists", listId] });
      toast({
        title: "Added to list",
        description: "The item has been added to your list",
      });
    },
  });

  const { data: watchlistData } = useQuery({
    queryKey: ["/api/watchlist", mediaId],
    queryFn: async () => {
      const res = await fetch(`/api/watchlist/${mediaId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch watchlist item");
      }
      return res.json();
    },
    enabled: !!mediaId,
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ id, progress }: { id: number; progress: number }) => {
      const res = await apiRequest("PATCH", `/api/watchlist/${id}`, { progress });
      if (!res.ok) {
        throw new Error('Failed to update watchlist progress')
      }
      return res.json();
    },
  });

  const isInWatchlist = watchlistData?.watchlistItem != null;
  const isWatching = watchlistData?.watchlistItem?.status === "watching";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl h-[80vh]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : details ? (
          <ScrollArea className="h-full pr-4">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {details.Title}
              </DialogTitle>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{details.Year}</span>
                <span>•</span>
                <span>{details.Runtime}</span>
                {details.imdbRating && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{details.imdbRating}</span>
                    </div>
                  </>
                )}
              </div>
            </DialogHeader>

            <div className="mt-6 space-y-6">
              <div className="flex gap-6">
                <img
                  src={details.Poster}
                  alt={details.Title}
                  className="w-48 aspect-[2/3] object-cover rounded-lg"
                />
                <div className="space-y-4 flex-1">
                  <p className="text-muted-foreground">{details.Plot}</p>

                  {/* Action Buttons Section */}
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => startWatchingMutation.mutate()}
                        disabled={startWatchingMutation.isPending}
                        className="flex-1"
                        variant="default"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Watching
                      </Button>
                      <Button
                        onClick={() => addToWatchlistMutation.mutate()}
                        disabled={addToWatchlistMutation.isPending}
                        className="flex-1"
                        variant="secondary"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Watchlist
                      </Button>
                    </div>
                    {isInWatchlist ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg">
                          <Clock className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">
                            {isWatching ? "Currently Watching" : "In Watchlist"}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="flex-1">
                            <Star className="h-4 w-4 mr-2" />
                            Rate
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <DropdownMenuItem
                              key={rating}
                              onClick={() => rateMutation.mutate(rating)}
                            >
                              <div className="flex items-center">
                                {Array.from({ length: rating }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className="h-4 w-4 text-yellow-400 fill-yellow-400"
                                  />
                                ))}
                                <span className="ml-2">{rating} stars</span>
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="flex-1">
                            Add to List
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {customLists?.map((list) => (
                            <DropdownMenuItem
                              key={list.id}
                              onClick={() => addToListMutation.mutate(list.id)}
                            >
                              {list.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {isWatching && watchlistData?.watchlistItem && (
                    <div className="mt-4 p-4 border rounded-lg bg-card">
                      <h3 className="text-sm font-medium mb-4">Watch Timer</h3>
                      <WatchTimer
                        mediaId={mediaId}
                        watchlistId={watchlistData.watchlistItem.id}
                        totalDuration={parseInt(details.Runtime)}
                        onProgressUpdate={(progress) => {
                          if (progress > (watchlistData.watchlistItem?.progress ?? 0)) {
                            updateProgressMutation.mutate({
                              id: watchlistData.watchlistItem.id,
                              progress,
                            });
                          }
                        }}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div>
                      <h4 className="font-semibold">Director</h4>
                      <p className="text-muted-foreground">{details.Director}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">Cast</h4>
                      <p className="text-muted-foreground">{details.Actors}</p>
                    </div>
                    {details.totalSeasons && (
                      <div>
                        <h4 className="font-semibold">Seasons</h4>
                        <p className="text-muted-foreground">
                          {details.totalSeasons}
                        </p>
                      </div>
                    )}
                    {details.Type === "series" && (
                      <div>
                        <h4 className="font-semibold">Status</h4>
                        <p className="text-muted-foreground">
                          {new Date(details.Year.split("–")[1] || new Date()) >
                            new Date()
                            ? "Currently Airing"
                            : "Ended"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {details.Type === "series" && details.Episodes && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">Episodes</h3>
                    {details.totalSeasons && (
                      <Select
                        value={currentSeason}
                        onValueChange={setCurrentSeason}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue>Season {currentSeason}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(
                            { length: parseInt(details.totalSeasons) },
                            (_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                Season {i + 1}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-3">
                    {details.Episodes.map((episode: any) => (
                      <div
                        key={episode.imdbID}
                        className="p-4 rounded-lg border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-background/60"
                      >
                        <div className="flex justify-between items-center gap-4">
                          <div>
                            <h4 className="font-medium flex items-baseline gap-2">
                              <span className="text-lg">
                                {episode.Episode}.
                              </span>
                              <span>{episode.Title}</span>
                            </h4>
                            {episode.imdbRating && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span>{episode.imdbRating}</span>
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground shrink-0">
                            {episode.Released}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}