import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Star, History, Clock } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import WatchProgress from "./watch-progress";
import WatchTimer from "./watch-timer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WatchSession {
  id: number;
  startTime: string;
  duration: number;
  title: string;
}

interface MediaDetailsProps {
  mediaId: string;
  isOpen: boolean;
  onClose: () => void;
  isProfileView?: boolean;
  watchlistId?: number;
}

export default function MediaDetails({
  mediaId,
  isOpen,
  onClose,
  isProfileView = false,
  watchlistId,
}: MediaDetailsProps) {
  const [currentSeason, setCurrentSeason] = useState("1");
  const [showHistory, setShowHistory] = useState(false);

  const { data: details, isLoading } = useQuery({
    queryKey: ["/api/media", mediaId, currentSeason],
    queryFn: async () => {
      const res = await fetch(`/api/media/${mediaId}?season=${currentSeason}`);
      if (!res.ok) {
        throw new Error('Failed to fetch media details');
      }
      return res.json();
    },
    enabled: isOpen && !!mediaId,
    staleTime: 1000 * 60 * 60, // Consider data fresh for 1 hour
  });

  // Query for currently watching status
  const { data: watching } = useQuery({
    queryKey: ["/api/currently-watching", mediaId],
    queryFn: async () => {
      const res = await fetch(`/api/currently-watching/${mediaId}`);
      if (!res.ok) throw new Error('Failed to fetch watching status');
      return res.json();
    },
    enabled: isOpen && !!mediaId,
  });

  // Query for recent watch sessions
  const { data: sessions } = useQuery<WatchSession[]>({
    queryKey: ["/api/statistics/watch-sessions"],
    enabled: isOpen && showHistory,
  });

  const formatDuration = (duration: number) => {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl h-[80vh]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : details ? (
          <ScrollArea className="h-full pr-4">
            <DialogHeader className="space-y-4">
              <DialogTitle className="text-2xl font-bold">
                {details.Title}
              </DialogTitle>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{details.Year}</span>
                <span>•</span>
                <span>{details.Runtime}</span>
                {details.imdbRating && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{details.imdbRating}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Progress Tracking - Moved to top */}
              {watching?.watchingItem && details.Type === "series" && (
                <div className="mt-4">
                  <WatchProgress
                    watchlistId={watching.watchingItem.id}
                    mediaId={mediaId}
                    currentProgress={watching.watchingItem.progress}
                    type={details.Type}
                  />
                </div>
              )}

              {/* Watch Session Controls */}
              {watching?.watchingItem && (
                <>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Watch Sessions
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowHistory(!showHistory)}
                      >
                        <History className="h-4 w-4 mr-2" />
                        {showHistory ? "Hide History" : "Show History"}
                      </Button>
                    </div>

                    <WatchTimer
                      mediaId={mediaId}
                      watchlistId={watching.watchingItem.id}
                      totalDuration={details?.Runtime ? parseInt(details.Runtime) : undefined}
                      onProgressUpdate={(progress) => {
                        // Progress update will be handled by WatchProgress component
                      }}
                    />

                    {showHistory && sessions && sessions.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Recent History</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {sessions.slice(0, 5).map((session) => (
                            <div
                              key={session.id}
                              className="flex justify-between items-center p-2 rounded-lg border bg-card/50"
                            >
                              <div className="space-y-1">
                                <p className="font-medium">
                                  {new Date(session.startTime).toLocaleDateString(undefined, {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(session.startTime).toLocaleTimeString(undefined, {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              <span className="text-sm font-medium">
                                {formatDuration(session.duration)}
                              </span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  <Separator className="my-4" />
                </>
              )}

              {/* Progress Tracking for non-series */}
              {watching?.watchingItem && details.Type !== "series" && (
                <>
                  <WatchProgress
                    watchlistId={watching.watchingItem.id}
                    mediaId={mediaId}
                    currentProgress={watching.watchingItem.progress}
                    type={details.Type}
                  />
                  <Separator className="my-4" />
                </>
              )}
            </DialogHeader>

            <div className="space-y-6">
              <div className="flex gap-6">
                <img
                  src={details.Poster}
                  alt={details.Title}
                  className="w-48 h-72 object-contain rounded-lg bg-secondary/50"
                />
                <div className="space-y-4 flex-1">
                  <p className="text-muted-foreground">{details.Plot}</p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold">Director</h4>
                      <p className="text-muted-foreground">{details.Director}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold">Cast</h4>
                      <p className="text-muted-foreground">{details.Actors}</p>
                    </div>
                    {details.totalSeasons && (
                      <div>
                        <h4 className="font-semibold">Seasons</h4>
                        <p className="text-muted-foreground">
                          {details.totalSeasons}
                        </p>
                      </div>
                    )}
                    {details.Type === "series" && (
                      <div>
                        <h4 className="font-semibold">Status</h4>
                        <p className="text-muted-foreground">
                          {new Date(details.Year.split("–")[1] || new Date()) >
                          new Date()
                            ? "Currently Airing"
                            : "Ended"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Episodes List Section */}
              {details.Type === "series" && details.Episodes && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Episodes</h3>
                  <div className="space-y-3">
                    {details.Episodes.map((episode: any) => (
                      <div
                        key={episode.imdbID}
                        className="p-4 rounded-lg border bg-card/50"
                      >
                        <div className="flex justify-between items-center gap-4">
                          <div>
                            <h4 className="font-medium">
                              <span className="text-lg">
                                {episode.Episode}.{" "}
                              </span>
                              {episode.Title}
                            </h4>
                            {episode.imdbRating && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span>{episode.imdbRating}</span>
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {episode.Released}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}