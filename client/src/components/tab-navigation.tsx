import { Link, useLocation } from "wouter";
import { User, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export default function TabNavigation() {
  const [location, navigate] = useLocation();

  const handleSearch = (query: string) => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const tabs = [
    { icon: User, label: "Profile", href: "/" },
    { icon: Search, label: "Search", href: "/search" },
    { icon: Users, label: "Friends", href: "/friends" },
  ];

  const isSearchPage = location === "/search";

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border">
      {!isSearchPage && (
        <div className="px-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search movies, shows, or anime..."
              className="w-full pl-10 bg-secondary"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch((e.target as HTMLInputElement).value);
                }
              }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-1 px-4 py-2">
        {tabs.map(({ icon: Icon, label, href }) => (
          <Link key={href} href={href}>
            <button
              className={cn(
                "flex flex-col items-center justify-center py-1 px-2 gap-1 w-full rounded-lg transition-colors",
                location === href 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          </Link>
        ))}
      </div>
    </div>
  );
}