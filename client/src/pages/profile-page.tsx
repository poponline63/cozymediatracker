import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import MovieGrid from "@/components/movie-grid";
import Layout from "@/components/layout";
import type { Watchlist, CurrentlyWatching, User } from "@shared/schema";
import { Settings2, ChartPie, ListPlus, Clock, Eye } from "lucide-react";
import { useState } from "react";
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
import { useLocation } from "wouter";

export default function ProfilePage() {
  const [location] = useLocation();
  const mediaIdFromUrl = new URLSearchParams(location.split("?")[1]).get("media");

  const { data: watchlist, isLoading: isLoadingWatchlist } = useQuery<Watchlist[]>({
    queryKey: ["/api/watchlist"],
  });

  const { data: currentlyWatching, isLoading: isLoadingCurrentlyWatching } = useQuery<CurrentlyWatching[]>({
    queryKey: ["/api/currently-watching"],
  });

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(mediaIdFromUrl);
  const [isUpdateProfileOpen, setIsUpdateProfileOpen] = useState(false);

  const watching = currentlyWatching?.map(item => ({
    id: item.id.toString(),
    mediaId: item.mediaId,
    title: item.title,
    type: item.type,
    status: "watching" as const,
    posterUrl: item.posterUrl || undefined,
    progress: item.progress ?? undefined,
  })) || [];

  const planToWatch = watchlist?.filter(item => item.status === "plan_to_watch").map(item => ({
    id: item.id.toString(),
    mediaId: item.mediaId,
    title: item.title,
    type: item.type,
    status: "plan_to_watch" as const,
    posterUrl: item.posterUrl || undefined,
    progress: item.progress ?? undefined,
    rating: item.rating ?? undefined,
    watchlistId: item.id,
  })) || [];

  const completed = watchlist?.filter(item => item.status === "completed").map(item => ({
    id: item.id.toString(),
    mediaId: item.mediaId,
    title: item.title,
    type: item.type,
    status: "completed" as const,
    posterUrl: item.posterUrl || undefined,
    rating: item.rating ?? undefined,
    watchlistId: item.id,
  })) || [];

  const stats = {
    watching: watching.length,
    planToWatch: planToWatch.length,
    completed: completed.length,
  };

  const completionData = [
    { name: "Watching", value: stats.watching, color: "#3b82f6" },
    { name: "Plan to Watch", value: stats.planToWatch, color: "#f59e0b" },
    { name: "Completed", value: stats.completed, color: "#22c55e" },
  ];

  return (
    <Layout>
      <div className="max-w-screen-2xl mx-auto px-4 space-y-8 pb-20">
        {/* Profile Header */}
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
          <Dialog open={isUpdateProfileOpen} onOpenChange={setIsUpdateProfileOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings2 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
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

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Watching</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.watching}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Plan to Watch</CardTitle>
              <ListPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.planToWatch}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Overview</CardTitle>
              <ChartPie className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={completionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={40}
                      paddingAngle={2}
                    >
                      {completionData.map((entry, index) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Media Lists */}
        <div>
          <Tabs defaultValue="watching" className="space-y-4">
            <TabsList>
              <TabsTrigger value="watching">
                Currently Watching ({watching.length})
              </TabsTrigger>
              <TabsTrigger value="plan_to_watch">
                Plan to Watch ({planToWatch.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completed.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="watching" className="space-y-4">
              <MovieGrid
                items={watching}
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

            <TabsContent value="completed" className="space-y-4">
              <MovieGrid
                items={completed}
                isLoading={isLoadingWatchlist}
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