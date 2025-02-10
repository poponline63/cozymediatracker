import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import WatchProgress from "./watch-progress";
import type { CurrentlyWatching } from "@shared/schema";

export default function CurrentlyWatchingList() {
  const { data: watching, isLoading } = useQuery<CurrentlyWatching[]>({
    queryKey: ["/api/currently-watching"],
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  if (!watching?.length) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-muted-foreground">
          <Clock className="w-4 h-4 mx-auto mb-2" />
          Not watching anything right now
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {watching.map((item) => (
        <Card key={item.id} className="relative overflow-hidden hover:bg-accent/50 transition-colors">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <img
                src={item.posterUrl || ""}
                alt={item.title}
                className="w-10 h-14 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate text-sm">{item.title}</h4>
                <WatchProgress
                  watchlistId={item.id}
                  mediaId={item.mediaId}
                  currentProgress={item.progress || 0}
                  type={item.type}
                  compact
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}