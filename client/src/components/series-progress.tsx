import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SeriesProgressProps {
  watchlistId: number;
  mediaId: string;
  currentSeason?: number;
  currentEpisode?: number;
  totalSeasons?: number;
}

export default function SeriesProgress({
  watchlistId,
  mediaId,
  currentSeason = 1,
  currentEpisode = 1,
  totalSeasons = 1,
}: SeriesProgressProps) {
  const { toast } = useToast();
  const [season, setSeason] = useState(currentSeason);
  const [episode, setEpisode] = useState(currentEpisode);

  const updateProgressMutation = useMutation({
    mutationFn: async () => {
      const progress = calculateProgress(season, episode, totalSeasons);
      const response = await apiRequest(
        "PATCH",
        `/api/currently-watching/${watchlistId}/progress`,
        {
          progress,
          currentSeason: season,
          currentEpisode: episode,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update progress");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/currently-watching"] });
      queryClient.invalidateQueries({ queryKey: ["/api/currently-watching", mediaId] });
      toast({
        title: "Progress Updated",
        description: `Updated to Season ${season}, Episode ${episode}`,
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

  // Calculate progress as a percentage based on current position in series
  const calculateProgress = (season: number, episode: number, totalSeasons: number) => {
    // Assuming average of 12 episodes per season for simplicity
    const episodesPerSeason = 12;
    const totalEpisodes = totalSeasons * episodesPerSeason;
    const watchedEpisodes = ((season - 1) * episodesPerSeason) + episode;
    return Math.round((watchedEpisodes / totalEpisodes) * 100);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1 block">Season</label>
          <Select
            value={season.toString()}
            onValueChange={(value) => setSeason(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: totalSeasons }, (_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  Season {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium mb-1 block">Episode</label>
          <Select
            value={episode.toString()}
            onValueChange={(value) => setEpisode(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  Episode {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button 
        className="w-full"
        onClick={() => updateProgressMutation.mutate()}
        disabled={updateProgressMutation.isPending}
      >
        Update Progress
      </Button>
    </div>
  );
}
