import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Check } from "lucide-react";
import WatchTimer from "./watch-timer";
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
  const { toast } = useToast();

  // Fetch media details to get total seasons/episodes
  const { data: details } = useQuery({
    queryKey: ["/api/media", mediaId, currentSeason],
    queryFn: async () => {
      const res = await fetch(`/api/media/${mediaId}?season=${currentSeason}`);
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
          : "Successfully updated your watch progress",
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
    if (type === "series" && details?.Episodes) {
      const totalEpisodes = details.Episodes.length;
      const currentEpisodeNumber = parseInt(currentEpisode);
      const totalSeasons = parseInt(details.totalSeasons || "1");
      const currentSeasonNumber = parseInt(currentSeason);

      // Calculate overall progress based on current episode and total episodes
      const seasonProgress = ((currentSeasonNumber - 1) / totalSeasons) * 100;
      const episodeProgress = (currentEpisodeNumber / totalEpisodes) * (100 / totalSeasons);
      const newProgress = Math.min(Math.round(seasonProgress + episodeProgress), 100);

      setProgress(newProgress);

      updateMutation.mutate({
        id: watchlistId,
        progress: newProgress,
        season: currentSeason,
        episode: currentEpisode,
      });
    }
  }, [currentSeason, currentEpisode, details?.Episodes, details?.totalSeasons, type]);

  // Handle progress updates for movies
  const handleProgressUpdate = (newProgress: number) => {
    setProgress(newProgress);
    if (type !== "series") {
      updateMutation.mutate({
        id: watchlistId,
        progress: newProgress,
      });
    }
  };

  if (type === "series") {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">Track Your Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Season</label>
              <Select value={currentSeason} onValueChange={setCurrentSeason}>
                <SelectTrigger>
                  <SelectValue>Season {currentSeason}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Array.from(
                    { length: parseInt(details?.totalSeasons || "1") },
                    (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        Season {i + 1}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Episode</label>
              <Select value={currentEpisode} onValueChange={setCurrentEpisode}>
                <SelectTrigger>
                  <SelectValue>Episode {currentEpisode}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {details?.Episodes?.map((episode: any) => (
                    <SelectItem key={episode.Episode} value={episode.Episode.toString()}>
                      Episode {episode.Episode} - {episode.Title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          <WatchTimer
            mediaId={mediaId}
            watchlistId={watchlistId}
            totalDuration={details?.Runtime ? parseInt(details.Runtime) : undefined}
            onProgressUpdate={handleProgressUpdate}
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
        <div className="flex gap-4 items-center">
          <div className="flex-1 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          <Button 
            variant={progress === 100 ? "default" : "outline"}
            size="sm"
            onClick={() => handleProgressUpdate(progress === 100 ? 0 : 100)}
          >
            <Check className={`h-4 w-4 mr-2 ${progress === 100 ? "text-primary-foreground" : ""}`} />
            {progress === 100 ? "Completed" : "Mark Complete"}
          </Button>
        </div>
        <WatchTimer
          mediaId={mediaId}
          watchlistId={watchlistId}
          totalDuration={details?.Runtime ? parseInt(details.Runtime) : undefined}
          onProgressUpdate={handleProgressUpdate}
        />
      </CardContent>
    </Card>
  );
}