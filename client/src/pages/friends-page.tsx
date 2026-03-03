import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Users, UserPlus, Check, X, UserMinus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Layout from "@/components/layout";

type Friend = {
  id: number;
  username: string;
  avatarUrl: string | null;
  friendshipId: number;
};

type FriendRequest = {
  id: number;
  requesterId: number;
  receiverId: number;
  status: string;
  createdAt: string;
  requester: {
    id: number;
    username: string;
    avatarUrl: string | null;
  };
};

export default function FriendsPage() {
  const [username, setUsername] = useState("");
  const { toast } = useToast();

  const { data: friends = [], isLoading: loadingFriends } = useQuery<Friend[]>({
    queryKey: ["/api/friends"],
  });

  const { data: requests = [], isLoading: loadingRequests } = useQuery<FriendRequest[]>({
    queryKey: ["/api/friends/requests"],
  });

  const sendRequestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/friends/request", { username });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Friend request sent!", description: `Request sent to ${username}` });
      setUsername("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send request", description: error.message, variant: "destructive" });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/friends/${id}/accept`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
      toast({ title: "Friend request accepted!" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/friends/${id}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
      toast({ title: "Friend request rejected" });
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: async (friendshipId: number) => {
      await apiRequest("DELETE", `/api/friends/${friendshipId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      toast({ title: "Friend removed" });
    },
  });

  return (
    <Layout>
      <div className="p-4 space-y-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-semibold">Friends</h1>
          {friends.length > 0 && (
            <Badge variant="secondary">{friends.length}</Badge>
          )}
        </div>

        {/* Add Friend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add Friend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && username && sendRequestMutation.mutate()}
              />
              <Button
                onClick={() => sendRequestMutation.mutate()}
                disabled={!username || sendRequestMutation.isPending}
              >
                {sendRequestMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Send"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pending Requests */}
        {(loadingRequests || requests.length > 0) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                Pending Requests
                {requests.length > 0 && (
                  <Badge className="bg-primary text-primary-foreground">{requests.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingRequests ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                </div>
              ) : requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending requests</p>
              ) : (
                requests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={req.requester.avatarUrl ?? undefined} />
                        <AvatarFallback>
                          {req.requester.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{req.requester.username}</p>
                        <p className="text-xs text-muted-foreground">wants to be friends</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => acceptMutation.mutate(req.id)}
                        disabled={acceptMutation.isPending}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectMutation.mutate(req.id)}
                        disabled={rejectMutation.isPending}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Friends List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">My Friends</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingFriends ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <Users className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">No friends yet</p>
                <p className="text-xs text-muted-foreground">Search by username above to send a request</p>
              </div>
            ) : (
              <div className="space-y-1">
                {friends.map((friend, i) => (
                  <div key={friend.id}>
                    {i > 0 && <Separator className="my-2" />}
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={friend.avatarUrl ?? undefined} />
                          <AvatarFallback>
                            {friend.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{friend.username}</p>
                          <p className="text-xs text-muted-foreground">Friend</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeFriendMutation.mutate(friend.friendshipId)}
                        disabled={removeFriendMutation.isPending}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
