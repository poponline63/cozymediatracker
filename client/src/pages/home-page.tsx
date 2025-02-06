import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MovieGrid from "@/components/movie-grid";
import Layout from "@/components/layout";

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["/api/search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return null;
      const res = await fetch(`/api/search?query=${encodeURIComponent(debouncedQuery)}`);
      return res.json();
    },
    enabled: Boolean(debouncedQuery),
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setDebouncedQuery(query);
  };

  return (
    <Layout showSearch onSearch={handleSearch} searchValue={searchQuery}>
      {!debouncedQuery ? (
        <div className="text-center py-12">
          <h2 className="text-3xl font-bold mb-4">Welcome to CozyWatch</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Search for your favorite movies, shows, and anime to start building your watchlist.
          </p>
        </div>
      ) : (
        <MovieGrid
          items={searchResults?.Search || []}
          isLoading={isLoading}
          showAddToList
        />
      )}
    </Layout>
  );
}