import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import MovieGrid from "@/components/movie-grid";
import Layout from "@/components/layout";
import type { Watchlist, CurrentlyWatching, User } from "@shared/schema";
import { Settings2 } from "lucide-react";
import { useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import MediaDetails from "@/components/media-details";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  const [showCompleted, setShowCompleted] = useState(false);

  // Transform watchlist items with proper type conversions
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

  // Transform currently watching items with proper type conversions
  const currentlyWatchingItems = currentlyWatching?.map(item => ({
    id: item.id.toString(),
    mediaId: item.mediaId,
    title: item.title,
    type: item.type,
    status: "watching" as const,
    posterUrl: item.posterUrl || undefined,
    progress: item.progress ?? undefined,
    watchlistId: undefined,
    isCompleted: item.isCompleted,
  })) || [];

  // Filter items based on completion status
  const filteredCurrentlyWatching = currentlyWatchingItems.filter(
    item => showCompleted ? item.isCompleted : !item.isCompleted
  );

  return (
    <Layout>
      <div className="max-w-screen-2xl mx-auto px-4 space-y-8">
        {/* User Profile Header */}
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

        {/* Currently Watching Section with Toggle */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {showCompleted ? "Completed Media" : "Currently Watching"}
            </h2>
            <div className="flex items-center space-x-2">
              <Switch
                id="show-completed"
                checked={showCompleted}
                onCheckedChange={setShowCompleted}
              />
              <Label htmlFor="show-completed">
                {showCompleted ? "Show Completed" : "Show In Progress"}
              </Label>
            </div>
          </div>
          <ScrollArea className="w-full whitespace-nowrap rounded-lg border">
            <div className="flex w-max space-x-4 p-4">
              {filteredCurrentlyWatching.map((item) => (
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
                  {item.progress && (
                    <p className="text-xs text-muted-foreground">
                      Progress: {item.progress}%
                    </p>
                  )}
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Watchlist Tabs Section */}
        <div>
          <Tabs defaultValue="watching" className="space-y-4">
            <TabsList>
              <TabsTrigger value="watching">
                Currently Watching ({filteredCurrentlyWatching.length})
              </TabsTrigger>
              <TabsTrigger value="plan_to_watch">
                Plan to Watch ({planToWatch.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="watching" className="space-y-4">
              <MovieGrid
                items={filteredCurrentlyWatching}
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

        {/* Media Details Dialog */}
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