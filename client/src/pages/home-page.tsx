import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MovieGrid from "@/components/movie-grid";

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedQuery(searchQuery);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            CozyWatch
          </h1>
          <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search movies, shows, and anime..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10"
              />
            </div>
          </form>
          <Link href="/profile">
            <Button variant="ghost" size="icon">
              My Watchlist
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
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
      </main>
    </div>
  );
}