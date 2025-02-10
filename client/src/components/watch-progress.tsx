import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Check, Loader2 } from "lucide-react";
import WatchTimer from "./watch-timer";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WatchProgressProps {
  watchlistId: number;
  mediaId: string;
  currentProgress?: number;
  type: string;
}

export default function WatchProgress({
  watchlistId,
  mediaId,
  currentProgress = 0,
  type,
}: WatchProgressProps) {
  const [progress, setProgress] = useState(currentProgress);
  const [currentSeason, setCurrentSeason] = useState("1");
  const [currentEpisode, setCurrentEpisode] = useState("1");
  const [isSliding, setIsSliding] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const { toast } = useToast();

  // Fetch media details to get total seasons/episodes
  const { data: details, isError: detailsError } = useQuery({
    queryKey: ["/api/media", mediaId, currentSeason],
    queryFn: async () => {
      const res = await fetch(`/api/media/${mediaId}?season=${currentSeason}`);
      if (res.status === 401) {
        throw new Error('Authentication required');
      }
      if (!res.ok) throw new Error('Failed to fetch episodes');
      return res.json();
    },
    enabled: type === "series",
    gcTime: 0,
    staleTime: 0
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      progress,
      season,
      episode,
    }: {
      id: number;
      progress: number;
      season?: string;
      episode?: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/currently-watching/${id}/progress`, {
        progress,
        currentSeason: season ? parseInt(season) : undefined,
        currentEpisode: episode ? parseInt(episode) : undefined,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update progress");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/currently-watching"] });
      toast({
        title: "Progress updated",
        description: type === "series"
          ? `Updated to Season ${currentSeason}, Episode ${currentEpisode}`
          : `Progress updated to ${progress}%`,
      });
    },
    onError: (error: Error) => {
      console.error("Failed to update progress:", error);
      toast({
        title: "Error updating progress",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update progress when season/episode changes for series
  useEffect(() => {
    if (type === "series" && details?.Episodes && !isSliding) {
      const totalEpisodes = details.Episodes.length;
      const currentEpisodeNumber = parseInt(currentEpisode);
      const totalSeasons = parseInt(details.totalSeasons || "1");
      const currentSeasonNumber = parseInt(currentSeason);

      // Calculate overall progress based on current episode and total episodes
      const seasonProgress = ((currentSeasonNumber - 1) / totalSeasons) * 100;
      const episodeProgress = (currentEpisodeNumber / totalEpisodes) * (100 / totalSeasons);
      const newProgress = Math.min(Math.round(seasonProgress + episodeProgress), 100);

      if (newProgress !== progress) {
        setProgress(newProgress);
        updateMutation.mutate({
          id: watchlistId,
          progress: newProgress,
          season: currentSeason,
          episode: currentEpisode,
        });
      }
    }
  }, [currentSeason, currentEpisode, details?.Episodes, details?.totalSeasons, type, isSliding]);

  // Handle progress updates for movies and manual scrubbing
  const handleProgressUpdate = (newProgress: number | number[]) => {
    const updatedProgress = Array.isArray(newProgress) ? newProgress[0] : newProgress;
    if (updatedProgress === progress) return;

    setProgress(updatedProgress);
    if (!isSliding) {
      updateMutation.mutate({
        id: watchlistId,
        progress: updatedProgress,
      });
    }
  };

  // Handle slider interactions
  const handleSliderChange = (value: number[]) => {
    setIsSliding(true);
    setProgress(value[0]);
  };

  const handleSliderCommit = (value: number[]) => {
    setIsSliding(false);
    updateMutation.mutate({
      id: watchlistId,
      progress: value[0],
    });
  };

  // When user is dragging the slider, we should pause the timer temporarily
  useEffect(() => {
    if (isSliding) {
      setIsTimerRunning(false);
    } else {
      setIsTimerRunning(true);
    }
  }, [isSliding]);

  if (detailsError) {
    return (
      <Card className="mt-4">
        <CardContent className="py-4">
          <div className="text-center text-muted-foreground">
            Failed to load media details. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (type === "series") {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">Track Your Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Season {currentSeason} of {details?.totalSeasons || 1}
              </label>
              <Select value={currentSeason} onValueChange={setCurrentSeason}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Loading...">
                    {updateMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating...
                      </div>
                    ) : (
                      `Season ${currentSeason}`
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Array.from(
                    { length: parseInt(details?.totalSeasons || "1") },
                    (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        <div className="flex flex-col">
                          <div className="font-medium">Season {i + 1}</div>
                          <div className="text-xs text-muted-foreground">
                            {details?.Episodes?.length || 0} episodes
                          </div>
                        </div>
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Episode {currentEpisode} of {details?.Episodes?.length || 0}
              </label>
              <Select value={currentEpisode} onValueChange={setCurrentEpisode}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Loading...">
                    {updateMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating...
                      </div>
                    ) : (
                      `Episode ${currentEpisode}`
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {details?.Episodes?.map((episode: any) => (
                    <SelectItem
                      key={episode.Episode}
                      value={episode.Episode.toString()}
                    >
                      <div className="flex flex-col">
                        <div className="font-medium">Episode {episode.Episode}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {episode.Title}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">Season {currentSeason} Progress</span>
                <span className="text-muted-foreground">
                  ({progress}% Complete)
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Episode {currentEpisode}/{details?.Episodes?.length || 0}
              </div>
            </div>
            <Slider
              defaultValue={[progress]}
              max={100}
              step={1}
              onValueChange={handleSliderChange}
              onValueCommit={handleSliderCommit}
              onPointerDown={() => setIsSliding(true)}
              onPointerUp={() => setIsSliding(false)}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground text-right">
              Overall: Season {currentSeason} of {details?.totalSeasons}
            </p>
          </div>

          <WatchTimer
            mediaId={mediaId}
            watchlistId={watchlistId}
            totalDuration={details?.Runtime ? parseInt(details.Runtime) : undefined}
            onProgressUpdate={handleProgressUpdate}
            isRunning={isTimerRunning}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Track Your Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <Slider
            defaultValue={[progress]}
            max={100}
            step={1}
            onValueChange={handleSliderChange}
            onValueCommit={handleSliderCommit}
            onPointerDown={() => setIsSliding(true)}
            onPointerUp={() => setIsSliding(false)}
            className="mt-2"
          />
          <Button
            variant={progress === 100 ? "default" : "outline"}
            size="sm"
            className="w-full mt-2"
            onClick={() => handleProgressUpdate(progress === 100 ? 0 : 100)}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className={`h-4 w-4 mr-2 ${progress === 100 ? "text-primary-foreground" : ""}`} />
            )}
            {progress === 100 ? "Completed" : "Mark Complete"}
          </Button>
        </div>

        <WatchTimer
          mediaId={mediaId}
          watchlistId={watchlistId}
          totalDuration={details?.Runtime ? parseInt(details.Runtime) : undefined}
          onProgressUpdate={handleProgressUpdate}
          isRunning={isTimerRunning}
        />
      </CardContent>
    </Card>
  );
}