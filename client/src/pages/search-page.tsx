import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import MovieGrid from "@/components/movie-grid";
import { Button } from "@/components/ui/button";
import MediaDetails from "@/components/media-details";
import Layout from "@/components/layout";

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["/api/search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return null;
      const res = await fetch(
        `/api/search?query=${encodeURIComponent(debouncedQuery)}`,
      );
      return res.json();
    },
    enabled: Boolean(debouncedQuery),
  });

  return (
    <Layout>
      <div className="p-4 space-y-4">
        <div className="sticky top-0 bg-background pt-2 pb-4 space-y-4">
          <h1 className="text-2xl font-semibold">Search Movies, Shows & Anime</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search movies, shows, or anime..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDebouncedQuery(e.target.value);
              }}
              className="w-full pl-10"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {searchResults?.Search?.length || 0} results
            </span>
            <Button variant="ghost" size="sm" className="text-sm">
              Sort by Relevance
            </Button>
          </div>
        </div>

        <MovieGrid
          items={searchResults?.Search || []}
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