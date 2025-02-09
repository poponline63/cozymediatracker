import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Star } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MediaDetailsProps {
  mediaId: string;
  isOpen: boolean;
  onClose: () => void;
  isProfileView?: boolean;
}

export default function MediaDetails({
  mediaId,
  isOpen,
  onClose,
  isProfileView = false,
}: MediaDetailsProps) {
  const [currentSeason, setCurrentSeason] = useState("1");

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl h-[80vh]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : details ? (
          <ScrollArea className="h-full pr-4">
            <DialogHeader>
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
            </DialogHeader>

            <div className="mt-6 space-y-6">
              <div className="flex gap-6">
                <img
                  src={details.Poster}
                  alt={details.Title}
                  className="w-48 h-72 object-contain rounded-lg bg-secondary/50"
                />
                <div className="space-y-4 flex-1">
                  <p className="text-muted-foreground">{details.Plot}</p>

                  <div className="grid grid-cols-2 gap-4 pt-4">
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

                  {/* Episodes List Section */}
                  {details.Type === "series" && details.Episodes && (
                    <div className="space-y-4 mt-6">
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
              </div>
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}