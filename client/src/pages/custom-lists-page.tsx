import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, List, Globe, Lock, Loader2, Film } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Layout from "@/components/layout";
import type { CustomList, CustomListItem } from "@shared/schema";

function ListItemCard({
  item,
  listId,
  onRemove,
}: {
  item: CustomListItem;
  listId: number;
  onRemove: (listId: number, mediaId: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 group transition-colors">
      {item.posterUrl ? (
        <img
          src={item.posterUrl}
          alt={item.title}
          className="w-10 h-14 object-cover rounded"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div className="w-10 h-14 rounded bg-muted flex items-center justify-center">
          <Film className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        <Badge variant="outline" className="text-xs mt-0.5 capitalize">{item.type}</Badge>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive h-7 w-7"
        onClick={() => onRemove(listId, item.mediaId)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function ListCard({
  list,
  onDelete,
  onRemoveItem,
}: {
  list: CustomList;
  onDelete: (id: number) => void;
  onRemoveItem: (listId: number, mediaId: string) => void;
}) {
  const { data: items = [], isLoading } = useQuery<CustomListItem[]>({
    queryKey: [`/api/custom-lists/${list.id}/items`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/custom-lists/${list.id}/items`);
      return res.json();
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">{list.name}</CardTitle>
              {list.isPublic ? (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Globe className="h-3 w-3" /> Public
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                  <Lock className="h-3 w-3" /> Private
                </Badge>
              )}
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {isLoading ? "…" : items.length} {items.length === 1 ? "item" : "items"}
              </Badge>
            </div>
            {list.description && (
              <p className="text-sm text-muted-foreground mt-1">{list.description}</p>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="text-destructive hover:text-destructive flex-shrink-0"
            onClick={() => onDelete(list.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading items...
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No items yet. Add movies or shows from the Search page.
          </p>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <ListItemCard
                key={item.id}
                item={item}
                listId={list.id}
                onRemove={onRemoveItem}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CustomListsPage() {
  const [open, setOpen] = useState(false);
  const [newList, setNewList] = useState({ name: "", description: "", isPublic: false });
  const { toast } = useToast();

  const { data: lists = [], isLoading } = useQuery<CustomList[]>({
    queryKey: ["/api/custom-lists"],
  });

  const createListMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/custom-lists", newList);
      if (!res.ok) throw new Error("Failed to create list");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-lists"] });
      toast({ title: "List created", description: `"${newList.name}" has been created` });
      setNewList({ name: "", description: "", isPublic: false });
      setOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to create list", variant: "destructive" });
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/custom-lists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-lists"] });
      toast({ title: "List deleted" });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async ({ listId, mediaId }: { listId: number; mediaId: string }) => {
      await apiRequest("DELETE", `/api/custom-lists/${listId}/items/${mediaId}`);
    },
    onSuccess: (_, { listId }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/custom-lists/${listId}/items`] });
      toast({ title: "Item removed from list" });
    },
  });

  return (
    <Layout>
      <div className="p-4 space-y-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <List className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-semibold">My Lists</h1>
            {lists.length > 0 && (
              <Badge variant="secondary">{lists.length}</Badge>
            )}
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New List
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New List</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="list-name">List Name *</Label>
                  <Input
                    id="list-name"
                    value={newList.name}
                    onChange={(e) => setNewList({ ...newList, name: e.target.value })}
                    placeholder="e.g. Weekend Watchlist"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="list-desc">Description</Label>
                  <Textarea
                    id="list-desc"
                    value={newList.description}
                    onChange={(e) => setNewList({ ...newList, description: e.target.value })}
                    placeholder="What's this list for?"
                    rows={2}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="list-public" className="text-sm font-medium cursor-pointer">
                      Make Public
                    </Label>
                    <p className="text-xs text-muted-foreground">Allow friends to see this list</p>
                  </div>
                  <Switch
                    id="list-public"
                    checked={newList.isPublic}
                    onCheckedChange={(checked) => setNewList({ ...newList, isPublic: checked })}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createListMutation.mutate()}
                  disabled={!newList.name.trim() || createListMutation.isPending}
                >
                  {createListMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</>
                  ) : (
                    "Create List"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lists */}
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading your lists...
          </div>
        ) : lists.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <List className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
            <p className="font-medium text-muted-foreground">No lists yet</p>
            <p className="text-sm text-muted-foreground">
              Create a list to start organizing your movies and shows
            </p>
            <Button variant="outline" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create your first list
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {lists.map((list) => (
              <ListCard
                key={list.id}
                list={list}
                onDelete={(id) => deleteListMutation.mutate(id)}
                onRemoveItem={(listId, mediaId) => removeItemMutation.mutate({ listId, mediaId })}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
