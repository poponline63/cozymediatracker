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
    <div className="grid grid-cols-3 gap-1 p-4">
      {tabs.map(({ icon: Icon, label, href }) => (
        <Link key={href} href={href}>
          <button
            className={cn(
              "flex flex-1 flex-col items-center justify-center py-3 px-2 gap-1 w-full",
              "bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors",
              location === href ? "bg-blue-600" : "bg-blue-500"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-sm font-medium">{label}</span>
          </button>
        </Link>
      ))}
    </div>
  );
}