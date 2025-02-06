import { useState, useEffect, useCallback } from "react";
import { Play, Pause, Square, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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
      if (!startTime) return;
      
      const endTime = new Date();
      const response = await apiRequest("POST", "/api/watch-sessions", {
        mediaId,
        watchlistId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statistics/watch-sessions"] });
      toast({
        title: "Watch session saved",
        description: "Your progress has been updated",
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
      await saveSessionMutation.mutateAsync();
    }
    setElapsedTime(0);
    setStartTime(null);
  };

  return (
    <div className="space-y-4">
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
          >
            <Play className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            variant="outline"
            onClick={handlePause}
            className="h-8 w-8"
          >
            <Pause className="h-4 w-4" />
          </Button>
        )}
        
        <Button
          size="icon"
          variant="outline"
          onClick={handleStop}
          className="h-8 w-8"
          disabled={elapsedTime === 0}
        >
          <Square className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
