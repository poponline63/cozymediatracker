import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Check, Loader2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface WatchProgressProps {
  watchlistId: number;
  mediaId: string;
  currentProgress?: number;
  type: string;
  compact?: boolean;
}

export default function WatchProgress({
  watchlistId,
  mediaId,
  currentProgress = 0,
  type,
  compact = false,
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
      if (!res.ok) throw new Error('Failed to fetch media details');
      return res.json();
    },
    enabled: !!mediaId,
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
        description: "Your watch progress has been updated successfully",
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

  const handleTimeInput = (value: string, field: 'hours' | 'minutes' | 'seconds') => {
    // Allow empty string for backspace/delete
    if (value === '') {
      switch (field) {
        case 'hours':
          setHours('0');
          break;
        case 'minutes':
          setMinutes('0');
          break;
        case 'seconds':
          setSeconds('0');
          break;
      }
      return;
    }

    // Validate input is a number
    if (!/^\d*$/.test(value)) {
      return;
    }

    // Validation limits
    const num = parseInt(value);
    if (num < 0) return;
    if ((field === 'minutes' || field === 'seconds') && num >= 60) return;

    switch (field) {
      case 'hours':
        setHours(value);
        break;
      case 'minutes':
        setMinutes(value);
        break;
      case 'seconds':
        setSeconds(value);
        break;
    }
  };

  const handleTimeUpdate = () => {
    if (!details?.Runtime) {
      toast({
        title: "Error",
        description: "Unable to determine media duration",
        variant: "destructive",
      });
      return;
    }

    const inputHours = parseInt(hours || "0");
    const inputMinutes = parseInt(minutes || "0");
    const inputSeconds = parseInt(seconds || "0");

    const totalInputSeconds = (inputHours * 3600) + (inputMinutes * 60) + inputSeconds;
    const totalDurationSeconds = parseInt(details.Runtime) * 60;

    if (totalInputSeconds > totalDurationSeconds) {
      toast({
        title: "Invalid time",
        description: "Entered time exceeds media duration",
        variant: "destructive",
      });
      return;
    }

    const newProgress = Math.min(Math.round((totalInputSeconds / totalDurationSeconds) * 100), 100);
    handleProgressUpdate(newProgress);
  };

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
      <div className="text-center text-muted-foreground text-sm">
        Failed to load progress
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Progress value={progress} className="flex-1 h-2" />
          <span className="text-sm font-medium whitespace-nowrap">{progress}%</span>
          <Button
            variant={progress === 100 ? "default" : "outline"}
            size="sm"
            className="h-8 px-2"
            onClick={() => handleProgressUpdate(progress === 100 ? 0 : 100)}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : progress === 100 ? (
              <Check className="h-4 w-4 text-primary-foreground" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="mt-4">
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time Position
          </label>
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Input
                type="text"
                value={hours}
                onChange={(e) => handleTimeInput(e.target.value, 'hours')}
                placeholder="Hours"
              />
              <span className="text-xs text-muted-foreground">Hours</span>
            </div>
            <div className="flex-1 space-y-1">
              <Input
                type="text"
                value={minutes}
                onChange={(e) => handleTimeInput(e.target.value, 'minutes')}
                placeholder="Minutes"
              />
              <span className="text-xs text-muted-foreground">Minutes</span>
            </div>
            <div className="flex-1 space-y-1">
              <Input
                type="text"
                value={seconds}
                onChange={(e) => handleTimeInput(e.target.value, 'seconds')}
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
      </CardContent>
    </Card>
  );
}