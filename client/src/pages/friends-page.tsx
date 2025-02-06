import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users } from "lucide-react";

export default function FriendsPage() {
  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-semibold">Friends</h1>
      </div>

      <div className="bg-blue-50/10 rounded-lg p-4">
        <p className="text-muted-foreground">
          Add friends to compare watch progress!
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Add Friends</h2>
        <div className="flex gap-2">
          <Input placeholder="Friend's username" />
          <Button>Send Request</Button>
        </div>
      </div>
    </div>
  );
}
