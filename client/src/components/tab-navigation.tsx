import { Link, useLocation } from "wouter";
import { User, Search, Users, List } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TabNavigation() {
  const [location] = useLocation();

  const tabs = [
    { icon: User, label: "Profile", href: "/" },
    { icon: Search, label: "Search", href: "/search" },
    { icon: List, label: "Watchlist", href: "/profile" },
    { icon: Users, label: "Friends", href: "/friends" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="grid grid-cols-4 gap-1 p-4 container mx-auto">
        {tabs.map(({ icon: Icon, label, href }) => (
          <Link key={href} href={href}>
            <button
              className={cn(
                "flex flex-col items-center justify-center py-2 px-2 gap-1 w-full rounded-lg transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                location === href 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          </Link>
        ))}
      </div>
    </div>
  );
}