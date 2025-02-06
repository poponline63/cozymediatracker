import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Star } from "lucide-react";

interface MediaDetailsProps {
  mediaId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function MediaDetails({
  mediaId,
  isOpen,
  onClose,
}: MediaDetailsProps) {
  const { data: details, isLoading } = useQuery({
    queryKey: ["/api/media", mediaId],
    queryFn: async () => {
      const res = await fetch(`/api/media/${mediaId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch media details');
      }
      return res.json();
    },
    enabled: isOpen && !!mediaId,
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
                  className="w-48 h-auto rounded-lg"
                />
                <div className="space-y-4">
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

              {details.Type === "series" && details.Episodes && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Episodes</h3>
                  <div className="space-y-4">
                    {details.Episodes.map((episode: any) => (
                      <div
                        key={episode.imdbID}
                        className="p-4 rounded-lg border bg-card"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">
                              {episode.Episode}. {episode.Title}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {episode.Plot}
                            </p>
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