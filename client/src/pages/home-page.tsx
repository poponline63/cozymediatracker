import { useQuery, useMutation } from "@tanstack/react-query";
import { Sparkles, PlayCircle, MailCheck } from "lucide-react";
import type { Watchlist, CurrentlyWatching } from "@shared/schema";
import MovieGrid from "@/components/movie-grid";
import Layout from "@/components/layout";
import Recommendations from "@/components/recommendations";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: currentlyWatching, isLoading: isLoadingCurrentlyWatching } = useQuery<CurrentlyWatching[]>({
    queryKey: ["/api/currently-watching"],
  });

  const { data: watchlist, isLoading: isLoadingWatchlist } = useQuery<Watchlist[]>({
    queryKey: ["/api/watchlist"],
  });

  const watching = currentlyWatching?.map(item => ({
    id: item.id.toString(),
    mediaId: item.mediaId,
    title: item.title,
    type: item.type,
    status: "watching" as const,
    posterUrl: item.posterUrl || undefined,
    progress: item.progress ?? undefined,
  })) || [];

  const resendMutation = useMutation({
    mutationFn: async () => { const r = await apiRequest("POST", "/api/resend-verification", {}); return r.json(); },
    onSuccess: () => toast({ title: "Verification email sent!" }),
  });

  const showVerifyBanner = user && user.email && !user.emailVerified;

  return (
    <Layout>
      <div className="p-4 space-y-8">
        {showVerifyBanner && (
          <Alert className="border-yellow-500/40 bg-yellow-950/20">
            <MailCheck className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-yellow-200 text-sm">Please verify your email address: <strong>{user.email}</strong></span>
              <Button size="sm" variant="outline" className="text-xs border-yellow-500/40 text-yellow-300 hover:bg-yellow-950/40"
                onClick={() => resendMutation.mutate()} disabled={resendMutation.isPending}>
                {resendMutation.isPending ? "Sending…" : "Resend email"}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <div className="flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-semibold">Discover</h1>
        </div>

        {/* Recommendations section */}
        <Recommendations />

        {/* Continue Watching section */}
        {watching.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <PlayCircle className="h-6 w-6 text-primary" />
              <h2 className="text-lg font-semibold">Continue Watching</h2>
            </div>
            <ScrollArea className="w-full whitespace-nowrap rounded-lg border">
              <div className="flex w-max space-x-4 p-4">
                {watching.map((item) => (
                  <div
                    key={item.id}
                    className="w-[150px] cursor-pointer"
                    onClick={() => navigate(`/profile?media=${item.mediaId}`)}
                  >
                    <div className="relative">
                      <img
                        src={item.posterUrl || ""}
                        alt={item.title}
                        className="w-full aspect-[2/3] rounded-lg object-cover"
                      />
                      {item.progress !== undefined && item.progress > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-medium truncate">{item.title}</p>
                    {item.progress !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        {item.progress}% complete
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        {!watching.length && !isLoadingCurrentlyWatching && (
          <div className="rounded-lg border p-8 text-center">
            <h3 className="text-lg font-semibold mb-2">Welcome to Your Media Tracker!</h3>
            <p className="text-muted-foreground mb-4">
              Start by adding shows or movies to your watchlist to track your progress
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}