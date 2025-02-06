import { Link, useLocation } from "wouter";
import { User, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TabNavigation() {
  const [location] = useLocation();

  const tabs = [
    { icon: User, label: "Profile", href: "/" },
    { icon: Search, label: "Search Movies", href: "/search" },
    { icon: Users, label: "Friends", href: "/friends" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="grid grid-cols-3 gap-1">
        {tabs.map(({ icon: Icon, label, href }) => (
          <Link key={href} href={href}>
            <button
              className={cn(
                "flex flex-1 flex-col items-center justify-center py-3 px-2 gap-1",
                "text-sm font-medium",
                location === href ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          </Link>
        ))}
      </div>
    </div>
  );
}
