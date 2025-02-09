import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
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

  // Fetch media details to get total seasons/episodes and duration
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
      const res = await apiRequest("PATCH", `/api/watchlist/${id}`, {
        status: "watching",
        progress,
        currentSeason: season,
        currentEpisode: episode,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Progress updated",
        description: "Successfully updated your watch progress",
      });
    },
  });

  // Auto-update when values change
  useEffect(() => {
    if (type === "series") {
      updateMutation.mutate({
        id: watchlistId,
        progress,
        season: currentSeason,
        episode: currentEpisode,
      });
    } else {
      updateMutation.mutate({ id: watchlistId, progress });
    }
  }, [progress, currentSeason, currentEpisode]);

  // For series, calculate progress based on current episode/total episodes
  useEffect(() => {
    if (type === "series" && details?.Episodes) {
      const totalEpisodes = details.Episodes.length;
      const currentEpisodeNumber = parseInt(currentEpisode);
      const newProgress = Math.round((currentEpisodeNumber / totalEpisodes) * 100);
      setProgress(newProgress);
    }
  }, [currentEpisode, details?.Episodes, type]);

  // Extract runtime from details
  const runtime = details?.Runtime?.split(' ')?.[0] || null;
  const totalDuration = runtime ? parseInt(runtime) : undefined;

  const handleProgressUpdate = (newProgress: number) => {
    setProgress(newProgress);
  };

  if (type === "series") {
    return (
      <div className="space-y-2 mt-2">
        <div className="flex gap-2">
          <Select value={currentSeason} onValueChange={setCurrentSeason}>
            <SelectTrigger className="w-32">
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
          <Select value={currentEpisode} onValueChange={setCurrentEpisode}>
            <SelectTrigger className="w-32">
              <SelectValue>Episode {currentEpisode}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {details?.Episodes?.map((episode: any) => (
                <SelectItem key={episode.Episode} value={episode.Episode.toString()}>
                  Episode {episode.Episode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Progress value={progress} className="h-2" />
        <WatchTimer
          mediaId={mediaId}
          watchlistId={watchlistId}
          totalDuration={totalDuration}
          onProgressUpdate={handleProgressUpdate}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-2">
        <Input
          type="number"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => setProgress(parseInt(e.target.value) || 0)}
          className="w-20"
        />
        <span className="text-muted-foreground self-center">%</span>
        <Button 
          variant={progress === 100 ? "default" : "outline"}
          size="sm"
          onClick={() => setProgress(progress === 100 ? 0 : 100)}
          className="ml-auto"
        >
          <Check className={`h-4 w-4 mr-2 ${progress === 100 ? "text-primary-foreground" : ""}`} />
          {progress === 100 ? "Completed" : "Mark Complete"}
        </Button>
      </div>
      <Progress value={progress} className="h-2" />
      <WatchTimer
        mediaId={mediaId}
        watchlistId={watchlistId}
        totalDuration={totalDuration}
        onProgressUpdate={handleProgressUpdate}
      />
    </div>
  );
}