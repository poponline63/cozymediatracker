import { useState, useEffect, useCallback } from "react";
import { Play, Pause, Square, Save, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WatchTimerProps {
  mediaId: string;
  watchlistId: number;
  totalDuration?: number; // in minutes
  onProgressUpdate?: (progress: number) => void;
}

export default function WatchTimer({ 
  mediaId, 
  watchlistId,
  totalDuration,
  onProgressUpdate 
}: WatchTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [startTime, setStartTime] = useState<Date | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveSessionMutation = useMutation({
    mutationFn: async () => {
      if (!startTime) {
        throw new Error("No start time recorded");
      }

      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000); // Duration in seconds

      const response = await apiRequest("POST", "/api/watch-sessions", {
        mediaId,
        watchlistId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save watch session");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statistics/watch-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/currently-watching"] });

      toast({
        title: "Watch session saved",
        description: `Successfully logged ${formatTime(elapsedTime)} of watch time`,
      });
    },
    onError: (error: Error) => {
      console.error('Watch session save error:', error);
      toast({
        title: "Error saving session",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  useEffect(() => {
    if (totalDuration && onProgressUpdate) {
      const progress = Math.min(
        Math.floor((elapsedTime / 60 / totalDuration) * 100),
        100
      );
      onProgressUpdate(progress);
    }
  }, [elapsedTime, totalDuration, onProgressUpdate]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setIsRunning(true);
    if (!startTime) {
      setStartTime(new Date());
    }
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleStop = async () => {
    setIsRunning(false);
    if (elapsedTime > 0) {
      try {
        await saveSessionMutation.mutateAsync();
        // Reset timer after successful save
        setElapsedTime(0);
        setStartTime(null);
      } catch (error) {
        console.error('Failed to save watch session:', error);
      }
    }
  };

  const handleNewSession = () => {
    if (isRunning || elapsedTime > 0) {
      handleStop();
    }
    setElapsedTime(0);
    setStartTime(null);
    setIsRunning(false);
    toast({
      title: "New session started",
      description: "Ready to begin tracking your watch time",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Current Session</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewSession}
            disabled={saveSessionMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Session
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-3xl font-mono text-center">
          {formatTime(elapsedTime)}
        </div>

        <div className="flex justify-center gap-2">
          {!isRunning ? (
            <Button
              size="icon"
              variant="outline"
              onClick={handleStart}
              className="h-8 w-8"
              title="Start"
            >
              <Play className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="outline"
              onClick={handlePause}
              className="h-8 w-8"
              title="Pause"
            >
              <Pause className="h-4 w-4" />
            </Button>
          )}

          <Button
            size="icon"
            variant="outline"
            onClick={handleStop}
            className="h-8 w-8"
            title="Stop and Save"
            disabled={elapsedTime === 0 || saveSessionMutation.isPending}
          >
            <Square className="h-4 w-4" />
          </Button>
        </div>

        {saveSessionMutation.isPending && (
          <p className="text-sm text-muted-foreground text-center">
            Saving watch session...
          </p>
        )}
        {saveSessionMutation.isError && (
          <p className="text-sm text-destructive text-center">
            Failed to save watch session
          </p>
        )}
      </CardContent>
    </Card>
  );
}