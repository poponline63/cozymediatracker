import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import MovieGrid from "@/components/movie-grid";
import Layout from "@/components/layout";
import type { Watchlist, CurrentlyWatching, User } from "@shared/schema";
import { Settings2, ChartPie } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { UpdateProfileForm } from "@/components/update-profile-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const { data: watchlist, isLoading: isLoadingWatchlist } = useQuery<Watchlist[]>({
    queryKey: ["/api/watchlist"],
  });

  const { data: currentlyWatching, isLoading: isLoadingCurrentlyWatching } = useQuery<CurrentlyWatching[]>({
    queryKey: ["/api/currently-watching"],
  });

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [isUpdateProfileOpen, setIsUpdateProfileOpen] = useState(false);
  const [showCompletionChart, setShowCompletionChart] = useState(false);

  const planToWatch = watchlist?.filter((item) => item.status === "plan_to_watch").map(item => ({
    id: item.id.toString(),
    mediaId: item.mediaId,
    title: item.title,
    type: item.type,
    status: "plan_to_watch" as const,
    posterUrl: item.posterUrl || undefined,
    progress: item.progress ?? undefined,
    rating: item.rating ?? undefined,
    watchlistId: item.id
  })) || [];

  const currentlyWatchingItems = currentlyWatching?.map(item => ({
    id: item.id.toString(),
    mediaId: item.mediaId,
    title: item.title,
    type: item.type,
    status: "watching" as const,
    posterUrl: item.posterUrl || undefined,
    progress: item.progress ?? undefined,
    watchlistId: undefined,
  })) || [];

  const completionStats = watchlist?.reduce(
    (acc, item) => {
      // For series, consider it completed if we've watched all episodes of the last season
      const isCompleted = item.type === "series"
        ? item.currentSeason === item.totalSeasons && item.progress === 100
        : item.progress === 100;

      if (isCompleted) {
        acc.completed += 1;
      } else if (item.progress > 0) {
        acc.incomplete += 1;
      }
      return acc;
    },
    { completed: 0, incomplete: 0 }
  ) || { completed: 0, incomplete: 0 };

  const completionData = [
    { name: "Completed", value: completionStats.completed, color: "hsl(var(--primary))" },
    { name: "In Progress", value: completionStats.incomplete, color: "hsl(var(--muted))" },
  ];

  if (!watchlist && isLoadingWatchlist) {
    return (
      <Layout>
        <div className="max-w-screen-2xl mx-auto px-4 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-screen-2xl mx-auto px-4 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.avatarUrl || undefined} alt={user?.username} />
              <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-semibold">{user?.username}</h1>
              <p className="text-muted-foreground">
                Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCompletionChart(!showCompletionChart)}
              className="gap-2"
            >
              <ChartPie className="h-4 w-4" />
              {showCompletionChart ? "Hide Stats" : "Show Stats"}
            </Button>
            <Dialog open={isUpdateProfileOpen} onOpenChange={setIsUpdateProfileOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings2 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Profile</DialogTitle>
                  <DialogDescription>
                    Make changes to your profile here. Click save when you're done.
                  </DialogDescription>
                </DialogHeader>
                {user && (
                  <UpdateProfileForm
                    defaultValues={{
                      username: user.username,
                      avatarUrl: user.avatarUrl || '',
                    }}
                    onSuccess={() => setIsUpdateProfileOpen(false)}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {showCompletionChart && (
          <Card>
            <CardHeader>
              <CardTitle>Media Completion Status</CardTitle>
              <CardDescription>
                Overview of your completed and in-progress media
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={completionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={120}
                      innerRadius={60}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {completionData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          className="stroke-background"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {completionData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {entry.name} ({entry.value})
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="text-lg font-semibold mb-4">Currently Watching</h2>
          <ScrollArea className="w-full whitespace-nowrap rounded-lg border">
            <div className="flex w-max space-x-4 p-4">
              {currentlyWatchingItems.map((item) => (
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

        <div>
          <Tabs defaultValue="watching" className="space-y-4">
            <TabsList>
              <TabsTrigger value="watching">
                Currently Watching ({currentlyWatchingItems.length})
              </TabsTrigger>
              <TabsTrigger value="plan_to_watch">
                Plan to Watch ({planToWatch.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="watching" className="space-y-4">
              <MovieGrid
                items={currentlyWatchingItems}
                isLoading={isLoadingCurrentlyWatching}
                showProgress
                showRemove
                onItemClick={(id) => setSelectedMediaId(id)}
              />
            </TabsContent>

            <TabsContent value="plan_to_watch" className="space-y-4">
              <MovieGrid
                items={planToWatch}
                isLoading={isLoadingWatchlist}
                showProgress
                showRemove
                onItemClick={(id) => setSelectedMediaId(id)}
              />
            </TabsContent>
          </Tabs>
        </div>

        {selectedMediaId && (
          <MediaDetails
            mediaId={selectedMediaId}
            isOpen={!!selectedMediaId}
            onClose={() => setSelectedMediaId(null)}
            isProfileView
          />
        )}
      </div>
    </Layout>
  );
}