import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface WatchProgressProps {
  watchlistId: number;
  currentProgress?: number;
}

export default function WatchProgress({
  watchlistId,
  currentProgress = 0,
}: WatchProgressProps) {
  const [progress, setProgress] = useState(currentProgress);
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      progress,
    }: {
      id: number;
      progress: number;
    }) => {
      const res = await apiRequest("PATCH", `/api/watchlist/${id}`, {
        status: "watching",
        progress,
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

  const handleUpdate = () => {
    updateMutation.mutate({ id: watchlistId, progress });
  };

  return (
    <div className="flex gap-2 mt-2">
      <Input
        type="number"
        min={0}
        value={progress}
        onChange={(e) => setProgress(parseInt(e.target.value) || 0)}
        className="w-20"
      />
      <Button
        size="sm"
        variant="outline"
        onClick={handleUpdate}
        disabled={updateMutation.isPending}
      >
        Update
      </Button>
    </div>
  );
}
