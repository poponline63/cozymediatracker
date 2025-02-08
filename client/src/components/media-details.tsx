import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MediaDetailsProps {
  mediaId: string;
  isOpen: boolean;
  onClose: () => void;
  isProfileView?: boolean;
}

interface CustomList {
  id: number;
  name: string;
}

export default function MediaDetails({
  mediaId,
  isOpen,
  onClose,
  isProfileView = false,
}: MediaDetailsProps) {
  const [currentSeason, setCurrentSeason] = useState("1");
  const [selectedEpisode, setSelectedEpisode] = useState("1");
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

  const { data: customLists } = useQuery<CustomList[]>({
    queryKey: ["/api/custom-lists"],
    enabled: !isProfileView,
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

  const updateProgressMutation = useMutation({
    mutationFn: async ({ progress, completed }: { progress?: number; completed?: boolean }) => {
      if (!watchlistData?.watchlistItem?.id) throw new Error("Watchlist item not found");
      
      // For movies, we want to set progress to 100 when completed
      const calculatedProgress = completed ? 100 : progress;

      const payload = details?.Type === "series" ? {
        progress: calculatedProgress,
        completed,
        currentSeason: parseInt(currentSeason),
        currentEpisode: parseInt(selectedEpisode),
        status: "watching",
      } : {
        progress: calculatedProgress,
        completed,
        status: "watching",
      };

      const res = await apiRequest("PATCH", `/api/watchlist/${watchlistData.watchlistItem.id}`, payload);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update progress");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Progress updated",
        description: "Your watching progress has been saved",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update progress",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isInWatchlist = watchlistData?.watchlistItem != null;
  const isWatching = watchlistData?.watchlistItem?.status === "watching";
  const isCompleted = watchlistData?.watchlistItem?.completed;

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
                  className="w-48 h-72 object-contain rounded-lg bg-secondary/50"
                />
                <div className="space-y-4 flex-1">
                  <p className="text-muted-foreground">{details.Plot}</p>

                  {/* Action Buttons Section */}
                  {!isProfileView ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => startWatchingMutation.mutate()}
                          disabled={startWatchingMutation.isPending || isWatching}
                          className="flex-1"
                          variant={isWatching ? "secondary" : "default"}
                        >
                          {isWatching ? (
                            <>
                              <Clock className="h-4 w-4 mr-2" />
                              Currently Watching
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Start Watching
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => addToWatchlistMutation.mutate()}
                          disabled={addToWatchlistMutation.isPending || isInWatchlist}
                          className="flex-1"
                          variant="secondary"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add to Watchlist
                        </Button>
                      </div>

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


                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Rating Section */}
                      <div className="space-y-2">
                        <Label>Your Rating</Label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <Button
                              key={rating}
                              variant="outline"
                              size="sm"
                              className={watchlistData?.watchlistItem?.rating === rating ? "bg-primary text-primary-foreground" : ""}
                              onClick={() => rateMutation.mutate(rating)}
                            >
                              <Star className={`h-4 w-4 ${watchlistData?.watchlistItem?.rating === rating ? "fill-primary-foreground" : "fill-none"}`} />
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Progress Tracking Section */}
                      {details.Type === "series" ? (
                        <div className="space-y-4">
                          <div className="flex gap-4">
                            <div className="flex-1 space-y-2">
                              <Label>Season</Label>
                              <Select
                                value={currentSeason}
                                onValueChange={(value) => {
                                  setCurrentSeason(value);
                                  setSelectedEpisode("1");
                                  queryClient.invalidateQueries(["/api/media", mediaId, value]);
                                }}
                              >
                                <SelectTrigger>
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
                            </div>
                            <div className="flex-1 space-y-2">
                              <Label>Episode</Label>
                              <Select
                                value={selectedEpisode}
                                onValueChange={setSelectedEpisode}
                              >
                                <SelectTrigger>
                                  <SelectValue>Episode {selectedEpisode}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {details.Episodes?.map((episode: any) => (
                                    <SelectItem
                                      key={episode.Episode}
                                      value={episode.Episode.toString()}
                                    >
                                      Episode {episode.Episode}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <Button
                            onClick={() => updateProgressMutation.mutate({
                              progress: Math.round((parseInt(selectedEpisode) / details.Episodes.length) * 100),
                              completed: parseInt(selectedEpisode) === details.Episodes.length
                            })}
                            className="w-full"
                            disabled={updateProgressMutation.isPending}
                          >
                            {updateProgressMutation.isPending ? "Updating..." : "Update Progress"}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={isCompleted}
                            onCheckedChange={(checked) =>
                              updateProgressMutation.mutate({ completed: checked, progress: checked ? 100 : 0 })
                            }
                          />
                          <Label>Mark as Completed</Label>
                        </div>
                      )}
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

                  {/* Episodes List Section */}
                  {details.Type === "series" && details.Episodes && (
                    <div className="space-y-4 mt-6">
                      <h3 className="text-lg font-semibold">Episodes</h3>
                      <div className="space-y-3">
                        {details.Episodes.map((episode: any) => (
                          <div
                            key={episode.imdbID}
                            className="p-4 rounded-lg border bg-card/50"
                          >
                            <div className="flex justify-between items-center gap-4">
                              <div>
                                <h4 className="font-medium">
                                  <span className="text-lg">
                                    {episode.Episode}.{" "}
                                  </span>
                                  {episode.Title}
                                </h4>
                                {episode.imdbRating && (
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    <span>{episode.imdbRating}</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {episode.Released}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}