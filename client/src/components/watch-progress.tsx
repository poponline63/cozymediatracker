import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Check, Loader2 } from "lucide-react";

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
  const { toast } = useToast();

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

  const handleProgressUpdate = (newProgress: number) => {
    if (newProgress === progress) return;
    setProgress(newProgress);
    updateMutation.mutate({
      id: watchlistId,
      progress: newProgress,
    });
  };

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
            <Check className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}