import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Heart, MessageCircle, Send, Trash2, Loader2, Rss, Film, Star, List, Bookmark, Play } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Layout from "@/components/layout";
import { formatDistanceToNow } from "date-fns";

type FeedItem = {
  id: number;
  userId: number;
  type: string;
  mediaId: string | null;
  mediaTitle: string | null;
  mediaType: string | null;
  posterUrl: string | null;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
  user: { id: number; username: string; avatarUrl: string | null };
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

type Comment = {
  id: number;
  activityId: number;
  userId: number;
  body: string;
  createdAt: string;
  user: { id: number; username: string; avatarUrl: string | null };
};

const ACTIVITY_ICONS: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  started_watching: { icon: <Play className="h-3.5 w-3.5" />, label: "started watching", color: "text-blue-400" },
  completed:        { icon: <Star className="h-3.5 w-3.5" />, label: "completed",         color: "text-yellow-400" },
  rated:            { icon: <Star className="h-3.5 w-3.5" />, label: "rated",             color: "text-orange-400" },
  added_to_list:    { icon: <List className="h-3.5 w-3.5" />, label: "added to list",     color: "text-purple-400" },
  added_to_watchlist: { icon: <Bookmark className="h-3.5 w-3.5" />, label: "added to watchlist", color: "text-green-400" },
};

function CommentSection({ activityId, currentUserId }: { activityId: number; currentUserId: number }) {
  const [text, setText] = useState("");
  const { toast } = useToast();

  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: [`/api/feed/${activityId}/comments`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/feed/${activityId}/comments`);
      return res.json();
    },
  });

  const postMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/feed/${activityId}/comments`, { body: text });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/feed/${activityId}/comments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      setText("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest("DELETE", `/api/feed/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/feed/${activityId}/comments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
    },
  });

  return (
    <div className="space-y-3 pt-2 border-t border-border/40">
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
      ) : (
        comments.map(c => (
          <div key={c.id} className="flex gap-2 items-start">
            <Avatar className="h-6 w-6 mt-0.5 flex-shrink-0">
              <AvatarImage src={c.user.avatarUrl ?? undefined} />
              <AvatarFallback className="text-[10px]">{c.user.username.slice(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 bg-muted/40 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold">{c.user.username}</p>
              <p className="text-sm text-muted-foreground">{c.body}</p>
            </div>
            {c.userId === currentUserId && (
              <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                onClick={() => deleteMutation.mutate(c.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))
      )}
      <div className="flex gap-2">
        <Input
          className="h-8 text-sm"
          placeholder="Write a comment..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && text.trim() && postMutation.mutate()}
        />
        <Button size="sm" className="h-8 px-2" disabled={!text.trim() || postMutation.isPending}
          onClick={() => postMutation.mutate()}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function FeedCard({ item, currentUserId }: { item: FeedItem; currentUserId: number }) {
  const [showComments, setShowComments] = useState(false);
  const meta = ACTIVITY_ICONS[item.type] ?? { icon: <Film className="h-3.5 w-3.5" />, label: item.type, color: "text-muted-foreground" };

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/feed/${item.id}/like`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
    },
  });

  const timeAgo = (() => {
    try { return formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }); }
    catch { return "recently"; }
  })();

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarImage src={item.user.avatarUrl ?? undefined} />
            <AvatarFallback>{item.user.username.slice(0,2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm">{item.user.username}</span>
              <span className={`flex items-center gap-1 text-xs ${meta.color}`}>
                {meta.icon} {meta.label}
              </span>
              {item.mediaTitle && (
                <span className="text-sm font-medium truncate max-w-[160px]">
                  {item.mediaTitle}
                </span>
              )}
              {item.type === "rated" && item.metadata?.rating && (
                <Badge variant="secondary" className="text-xs">
                  {"⭐".repeat(Number(item.metadata.rating))}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{timeAgo}</p>
          </div>
          {item.posterUrl && (
            <img src={item.posterUrl} alt={item.mediaTitle ?? ""} className="w-10 h-14 object-cover rounded flex-shrink-0" />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            className={`flex items-center gap-1.5 text-sm transition-colors ${item.likedByMe ? "text-red-500" : "text-muted-foreground hover:text-red-400"}`}
            onClick={() => likeMutation.mutate()}
            disabled={likeMutation.isPending}
          >
            <Heart className={`h-4 w-4 ${item.likedByMe ? "fill-current" : ""}`} />
            <span>{item.likeCount > 0 ? item.likeCount : ""}</span>
          </button>
          <button
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
            onClick={() => setShowComments(v => !v)}
          >
            <MessageCircle className="h-4 w-4" />
            <span>{item.commentCount > 0 ? item.commentCount : ""}</span>
          </button>
        </div>

        {/* Comments */}
        {showComments && <CommentSection activityId={item.id} currentUserId={currentUserId} />}
      </CardContent>
    </Card>
  );
}

export default function FeedPage() {
  const { user } = useAuth();

  const { data: feed = [], isLoading } = useQuery<FeedItem[]>({
    queryKey: ["/api/feed"],
  });

  return (
    <Layout>
      <div className="p-4 space-y-4 pb-24">
        <div className="flex items-center gap-3">
          <Rss className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-semibold">Activity Feed</h1>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading feed...
          </div>
        ) : feed.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Rss className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
            <p className="font-medium text-muted-foreground">Nothing here yet</p>
            <p className="text-sm text-muted-foreground">
              Add friends to see their activity, or start watching something!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {feed.map(item => (
              <FeedCard key={item.id} item={item} currentUserId={user!.id} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
