import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import MovieGrid from "@/components/movie-grid";
import { Button } from "@/components/ui/button";
import MediaDetails from "@/components/media-details";
import Layout from "@/components/layout";
import type { Watchlist } from "@shared/schema";

interface SearchResult {
  imdbID: string;
  Title: string;
  Type: string;
  Poster: string;
}

interface MovieGridItem {
  id: string;
  mediaId: string;
  title: string;
  type: string;
  posterUrl?: string;
  rating?: number;
  watchlistId?: number;
  status?: string;
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Get search query from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) {
      setSearchQuery(q);
      setDebouncedQuery(q);
    }
  }, []);

  // Update URL with search query
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (debouncedQuery) {
      params.set("q", debouncedQuery);
    } else {
      params.delete("q");
    }
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [debouncedQuery]);

  // Fetch search results
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["/api/search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return null;
      const res = await fetch(
        `/api/search?query=${encodeURIComponent(debouncedQuery)}`,
      );
      if (!res.ok) {
        throw new Error('Failed to fetch search results');
      }
      return res.json();
    },
    enabled: Boolean(debouncedQuery),
  });

  // Fetch watchlist status for all search results
  const { data: watchlistItems } = useQuery<Watchlist[]>({
    queryKey: ["/api/watchlist"],
    enabled: Boolean(searchResults?.Search?.length)
  });

  // Fetch ratings for all search results
  const { data: ratings } = useQuery({
    queryKey: ["/api/ratings", searchResults?.Search?.map((item: SearchResult) => item.imdbID)],
    queryFn: async () => {
      if (!searchResults?.Search) return {};
      const res = await fetch(`/api/ratings/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaIds: searchResults.Search.map((item: SearchResult) => item.imdbID)
        })
      });
      if (!res.ok) {
        throw new Error('Failed to fetch ratings');
      }
      return res.json();
    },
    enabled: Boolean(searchResults?.Search?.length)
  });

  // Transform search results to include watchlist and rating information
  const movieGridItems: MovieGridItem[] = searchResults?.Search?.map((item: SearchResult) => {
    const watchlistItem = watchlistItems?.find(w => w.mediaId === item.imdbID);
    return {
      id: item.imdbID,
      mediaId: item.imdbID,
      title: item.Title,
      type: item.Type,
      posterUrl: item.Poster !== "N/A" ? item.Poster : undefined,
      rating: ratings?.[item.imdbID],
      watchlistId: watchlistItem?.id,
      status: watchlistItem?.status
    };
  }) || [];

  return (
    <Layout>
      <div className="p-4 space-y-4">
        <div className="sticky top-0 bg-background pt-2 pb-4 space-y-4 z-10">
          <h1 className="text-2xl font-semibold">Search Results</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search movies, shows, or anime..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {searchResults?.Search?.length || 0} results for "{debouncedQuery}"
            </span>
            <Button variant="ghost" size="sm" className="text-sm">
              Sort by Relevance
            </Button>
          </div>
        </div>

        <MovieGrid
          items={movieGridItems}
          isLoading={isLoading}
          showAddToList
          onItemClick={(id) => setSelectedMediaId(id)}
        />

        <MediaDetails
          mediaId={selectedMediaId!}
          isOpen={!!selectedMediaId}
          onClose={() => setSelectedMediaId(null)}
        />
      </div>
    </Layout>
  );
}