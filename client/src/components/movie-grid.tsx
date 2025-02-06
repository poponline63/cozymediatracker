import { Loader2 } from "lucide-react";
import MediaCard from "./media-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

interface MovieGridProps {
  items: any[];
  isLoading: boolean;
  showAddToList?: boolean;
  showProgress?: boolean;
  showRemove?: boolean;
  onItemClick?: (id: string) => void;
}

export default function MovieGrid({
  items,
  isLoading,
  showAddToList,
  showProgress,
  showRemove,
  onItemClick,
}: MovieGridProps) {
  // Get current watchlist to check item status
  const { data: watchlist } = useQuery({
    queryKey: ["/api/watchlist"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="w-full aspect-[2/3]" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No items found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {items.map((item) => {
        const watchlistItem = watchlist?.find(
          (w) => w.mediaId === (item.imdbID || item.mediaId)
        );

        return (
          <div
            key={item.imdbID || item.id}
            className="cursor-pointer"
            onClick={() => onItemClick?.(item.imdbID || item.mediaId)}
          >
            <MediaCard
              id={item.imdbID || item.mediaId}
              title={item.Title || item.title}
              posterUrl={item.Poster || item.posterUrl}
              type={item.Type || item.type}
              showAddToList={!watchlistItem && showAddToList}
              showProgress={showProgress}
              showRemove={showRemove}
              progress={watchlistItem?.progress}
              watchlistId={watchlistItem?.id}
              status={watchlistItem?.status}
            />
          </div>
        );
      })}
    </div>
  );
}