import { Link, useLocation } from "wouter";
import { Home, Search, Rss, Users, Trophy, BarChart3, User, List } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TabNavigation() {
  const [location] = useLocation();

  const tabs = [
    { icon: Home,    label: "Home",    href: "/" },
    { icon: Search,  label: "Search",  href: "/search" },
    { icon: Rss,     label: "Feed",    href: "/feed" },
    { icon: Users,   label: "Friends", href: "/friends" },
    { icon: List,    label: "Lists",   href: "/lists" },
    { icon: Trophy,  label: "Badges",  href: "/achievements" },
    { icon: BarChart3, label: "Stats", href: "/statistics" },
    { icon: User,    label: "Profile", href: "/profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border z-50">
      <div className="grid grid-cols-8 gap-0.5 px-1 py-2">
        {tabs.map(({ icon: Icon, label, href }) => {
          const isActive = href === "/" ? location === "/" : location.startsWith(href);
          return (
            <Link key={href} href={href}>
              <button
                className={cn(
                  "flex flex-col items-center justify-center py-1 px-1 gap-0.5 w-full rounded-lg transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[9px] font-medium leading-none">{label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
