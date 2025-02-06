import { Link } from "wouter";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: React.ReactNode;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  searchValue?: string;
}

export default function Layout({ children, showSearch, onSearch, searchValue }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4">
          <div className="h-16 flex items-center justify-between gap-4">
            <Link href="/">
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                CozyWatch
              </h1>
            </Link>

            {showSearch && (
              <div className="flex-1 max-w-xl">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search movies, shows, and anime..."
                    value={searchValue}
                    onChange={(e) => onSearch?.(e.target.value)}
                    className="w-full pl-10"
                  />
                </div>
              </div>
            )}

            <nav className="flex items-center gap-2">
              <Link href="/friends">
                <Button variant="ghost" size="sm">
                  Friends
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant="ghost" size="sm">
                  My Watchlist
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
