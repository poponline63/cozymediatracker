import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import MovieGrid from "@/components/movie-grid";
import Layout from "@/components/layout";
import type { Watchlist, CurrentlyWatching } from "@shared/schema";
import { BarChart3, User, Clock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import MediaDetails from "@/components/media-details";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Statistics {
  totalWatchtime: number;
  totalItems: number;
  averageRating: number;
  ratedItems: number;
  averageDailyWatchtime: number;
  watchTimeByDay: Array<{
    day: string;
    hours: number;
  }>;
}

export default function ProfilePage() {
  const { data: watchlist, isLoading: isLoadingWatchlist } = useQuery<Watchlist[]>({
    queryKey: ["/api/watchlist"],
  });

  const { data: currentlyWatching, isLoading: isLoadingCurrentlyWatching } = useQuery<CurrentlyWatching[]>({
    queryKey: ["/api/currently-watching"],
  });

  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const planToWatch = watchlist?.filter((item) => item.status === "plan_to_watch") || [];

  // Statistics queries
  const { data: stats } = useQuery<Statistics>({
    queryKey: ["/api/statistics"],
  });

  // Calculate completion statistics
  const totalItems = currentlyWatching?.length || 0;
  const completedItems = currentlyWatching?.filter(item => item.isCompleted).length || 0;
  const inProgressItems = currentlyWatching?.filter(item => !item.isCompleted && item.progress > 0).length || 0;
  const notStartedItems = totalItems - completedItems - inProgressItems;

  const chartData = [
    { name: "Completed", value: completedItems, color: "#22c55e" },
    { name: "In Progress", value: inProgressItems, color: "#3b82f6" },
    { name: "Not Started", value: notStartedItems, color: "#6b7280" },
  ].filter(item => item.value > 0);

  return (
    <Layout>
      <div className="max-w-screen-2xl mx-auto px-4 space-y-8">
        <div className="flex items-center gap-3">
          <User className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-semibold">My Profile</h1>
        </div>

        {/* Currently Watching Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Currently Watching</h2>
          <ScrollArea className="w-full whitespace-nowrap rounded-lg border">
            <div className="flex w-max space-x-4 p-4">
              {currentlyWatching?.map((item) => (
                <div 
                  key={item.id} 
                  className="w-[150px] cursor-pointer"
                  onClick={() => setSelectedMediaId(item.mediaId)}
                >
                  <img
                    src={item.posterUrl || ""}
                    alt={item.title}
                    className="w-full aspect-[2/3] rounded-lg object-cover"
                  />
                  <p className="mt-2 text-sm font-medium truncate">{item.title}</p>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left side: Selected media or watchlist */}
          <div className="space-y-6">
            {selectedMediaId && (
              <MediaDetails
                mediaId={selectedMediaId}
                isOpen={!!selectedMediaId}
                onClose={() => setSelectedMediaId(null)}
                isProfileView
              />
            )}
          </div>

          {/* Right side: Progress chart */}
          <div className="p-6 border rounded-lg bg-card h-fit">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="h-8 w-8 text-primary" />
              <h2 className="text-lg font-semibold">Your Media Progress</h2>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Watch Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Math.floor((stats?.totalWatchtime || 0) / 60)}h {(stats?.totalWatchtime || 0) % 60}m
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Across {stats?.totalItems || 0} items
                    </p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  {chartData.map(({ name, value, color }) => (
                    <div key={name} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-sm font-medium">{name}</span>
                      </div>
                      <p className="text-2xl font-bold">{value}</p>
                      <p className="text-sm text-muted-foreground">
                        {Math.round((value / totalItems) * 100)}% of total
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} items`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Watchlist Tabs Section */}
        <div>
          <Tabs defaultValue="watching" className="space-y-4">
            <TabsList>
              <TabsTrigger value="watching">
                Currently Watching ({currentlyWatching?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="plan_to_watch">
                Plan to Watch ({planToWatch.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="watching" className="space-y-4">
              <MovieGrid
                items={currentlyWatching}
                isLoading={isLoadingCurrentlyWatching}
                showProgress
                showRemove
              />
            </TabsContent>

            <TabsContent value="plan_to_watch" className="space-y-4">
              <MovieGrid
                items={planToWatch}
                isLoading={isLoadingWatchlist}
                showProgress
                showRemove
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}