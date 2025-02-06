import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { CustomList } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Layout from "@/components/layout";
import MovieGrid from "@/components/movie-grid";

export default function CustomListsPage() {
  const [newList, setNewList] = useState({ name: "", description: "", isPublic: false });
  const { toast } = useToast();
  
  const { data: lists, isLoading } = useQuery<CustomList[]>({
    queryKey: ["/api/custom-lists"],
  });

  const createListMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/custom-lists", newList);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-lists"] });
      toast({
        title: "List created",
        description: `${newList.name} has been created successfully`,
      });
      setNewList({ name: "", description: "", isPublic: false });
    },
  });

  return (
    <Layout>
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">My Lists</h1>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create New List
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New List</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">List Name</Label>
                  <Input
                    id="name"
                    value={newList.name}
                    onChange={(e) => setNewList({ ...newList, name: e.target.value })}
                    placeholder="Weekend Watchlist"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newList.description}
                    onChange={(e) => setNewList({ ...newList, description: e.target.value })}
                    placeholder="Movies to watch on the weekend"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="public"
                    checked={newList.isPublic}
                    onCheckedChange={(checked) => setNewList({ ...newList, isPublic: checked })}
                  />
                  <Label htmlFor="public">Make this list public</Label>
                </div>
                <Button
                  className="w-full"
                  onClick={() => createListMutation.mutate()}
                  disabled={!newList.name || createListMutation.isPending}
                >
                  Create List
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div>Loading...</div>
        ) : lists?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>You haven't created any lists yet.</p>
            <p>Create a list to start organizing your movies and shows!</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {lists?.map((list) => (
              <div key={list.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{list.name}</h2>
                    <p className="text-muted-foreground">{list.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {list.isPublic && (
                      <span className="text-sm text-muted-foreground">Public</span>
                    )}
                  </div>
                </div>
                <MovieGrid
                  items={[]} // TODO: Implement list items fetch
                  isLoading={false}
                  showProgress={false}
                  showRemove
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
