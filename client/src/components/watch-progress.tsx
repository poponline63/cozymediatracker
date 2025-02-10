import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Check, Loader2, Clock } from "lucide-react";
import WatchTimer from "./watch-timer";
import { Input } from "@/components/ui/input";
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
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("0");
  const [seconds, setSeconds] = useState("0");
  const { toast } = useToast();

  // Fetch media details to get duration
  const { data: details, isError: detailsError } = useQuery({
    queryKey: ["/api/media", mediaId],
    queryFn: async () => {
      const res = await fetch(`/api/media/${mediaId}`);
      if (res.status === 401) {
        throw new Error('Authentication required');
      }
      if (!res.ok) throw new Error('Failed to fetch media details');
      return res.json();
    },
    gcTime: 0,
    staleTime: 0
  });

  // Update time inputs when progress changes
  useEffect(() => {
    if (details?.Runtime) {
      const totalMinutes = parseInt(details.Runtime);
      const totalSeconds = totalMinutes * 60;
      const progressSeconds = Math.floor((progress / 100) * totalSeconds);

      const hrs = Math.floor(progressSeconds / 3600);
      const mins = Math.floor((progressSeconds % 3600) / 60);
      const secs = progressSeconds % 60;

      setHours(hrs.toString());
      setMinutes(mins.toString());
      setSeconds(secs.toString());
    }
  }, [progress, details?.Runtime]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, progress }: { id: number; progress: number }) => {
      const res = await apiRequest("PATCH", `/api/currently-watching/${id}/progress`, {
        progress,
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
        description: "Successfully updated your watch progress",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating progress",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle time input updates
  const handleTimeUpdate = () => {
    if (!details?.Runtime) {
      toast({
        title: "Error",
        description: "Unable to determine media duration",
        variant: "destructive",
      });
      return;
    }

    const totalSeconds = (parseInt(hours || "0") * 3600) + (parseInt(minutes || "0") * 60) + parseInt(seconds || "0");
    const totalDuration = parseInt(details.Runtime) * 60; // Runtime is in minutes

    if (totalSeconds > totalDuration) {
      toast({
        title: "Warning",
        description: "Entered time exceeds media duration",
        variant: "destructive",
      });
      return;
    }

    const newProgress = Math.min(Math.round((totalSeconds / totalDuration) * 100), 100);
    handleProgressUpdate(newProgress);
  };

  // Handle progress updates
  const handleProgressUpdate = (newProgress: number) => {
    if (newProgress === progress) return;

    setProgress(newProgress);
    updateMutation.mutate({
      id: watchlistId,
      progress: newProgress,
    });
  };

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

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Track Your Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Current Time Position
          </label>
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Input
                type="number"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="Hours"
              />
              <span className="text-xs text-muted-foreground">Hours</span>
            </div>
            <div className="flex-1 space-y-1">
              <Input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="Minutes"
              />
              <span className="text-xs text-muted-foreground">Minutes</span>
            </div>
            <div className="flex-1 space-y-1">
              <Input
                type="number"
                min="0"
                max="59"
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
                placeholder="Seconds"
              />
              <span className="text-xs text-muted-foreground">Seconds</span>
            </div>
            <Button
              variant="secondary"
              onClick={handleTimeUpdate}
              disabled={updateMutation.isPending}
              className="self-start"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                "Update"
              )}
            </Button>
          </div>
          {details?.Runtime && (
            <p className="text-xs text-muted-foreground">
              Total duration: {details.Runtime} minutes
            </p>
          )}
        </div>

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
        />
      </CardContent>
    </Card>
  );
}