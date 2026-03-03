import { useQuery, useMutation } from "@tanstack/react-query";
import { Trophy, Flame, Target, Shuffle, Loader2, Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Layout from "@/components/layout";

type Achievement = { id: number; achievementKey: string; earnedAt: string };
type WatchGoal = { id: number; type: string; target: number; year: number };
type Stats = { totalItems: number; inProgressItems: number };
type WatchlistItem = { id: number; mediaId: string; title: string; type: string; posterUrl: string | null; status: string };

const ACHIEVEMENT_CATALOG: Record<string, { emoji: string; label: string; description: string }> = {
  first_watch:      { emoji: "🎬", label: "First Watch",       description: "Started watching your first title" },
  first_complete:   { emoji: "✅", label: "First Completion",  description: "Completed your first movie or show" },
  binge_watcher:    { emoji: "📺", label: "Binge Watcher",     description: "Completed 5 titles" },
  cinephile:        { emoji: "🎥", label: "Cinephile",         description: "Completed 20 titles" },
  first_rating:     { emoji: "⭐", label: "Critic",            description: "Rated your first title" },
  five_star:        { emoji: "🌟", label: "Five Star Fan",     description: "Gave a 5-star rating" },
  first_list:       { emoji: "📋", label: "List Maker",        description: "Created your first custom list" },
  social_butterfly: { emoji: "🦋", label: "Social Butterfly", description: "Added your first friend" },
  streak_3:         { emoji: "🔥", label: "On a Roll",         description: "3-day watch streak" },
  streak_7:         { emoji: "🚀", label: "Week Warrior",      description: "7-day watch streak" },
  night_owl:        { emoji: "🦉", label: "Night Owl",         description: "Watched something after midnight" },
};

function Confetti({ show }: { show: boolean }) {
  if (!show) return null;
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.5}s`,
    color: ["#FFD700","#4CAF50","#2196F3","#E91E63","#FF5722"][i % 5],
    size: `${6 + Math.random() * 8}px`,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: p.left,
            top: "-10px",
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: "2px",
            animation: `confettiFall 1.5s ${p.delay} ease-in forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function AchievementsPage() {
  const { toast } = useToast();
  const [showConfetti, setShowConfetti] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({ type: "movies", target: "", year: String(new Date().getFullYear()) });
  const [randomPick, setRandomPick] = useState<WatchlistItem | null>(null);
  const [pickOpen, setPickOpen] = useState(false);

  const { data: earned = [] } = useQuery<Achievement[]>({ queryKey: ["/api/achievements"] });
  const { data: streakData } = useQuery<{ streak: number }>({ queryKey: ["/api/streak"] });
  const { data: goals = [] } = useQuery<WatchGoal[]>({ queryKey: ["/api/goals"] });
  const { data: stats } = useQuery<Stats>({ queryKey: ["/api/statistics"] });

  const earnedKeys = new Set(earned.map(a => a.achievementKey));
  const streak = streakData?.streak ?? 0;

  // Confetti on new achievements
  const prevCount = useState(earned.length)[0];
  useEffect(() => {
    if (earned.length > prevCount) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
    }
  }, [earned.length]);

  const addGoalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/goals", {
        type: newGoal.type,
        target: Number(newGoal.target),
        year: Number(newGoal.year),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({ title: "Goal set!" });
      setGoalOpen(false);
      setNewGoal({ type: "movies", target: "", year: String(new Date().getFullYear()) });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/goals/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/goals"] }),
  });

  const pickRandom = async () => {
    const res = await apiRequest("GET", "/api/watchlist/random");
    const data = await res.json();
    setRandomPick(data);
    setPickOpen(true);
  };

  const completedCount = stats?.totalItems ?? 0;

  return (
    <Layout>
      <Confetti show={showConfetti} />
      <div className="p-4 space-y-6 pb-24">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Trophy className="h-7 w-7 text-yellow-400" />
          <h1 className="text-2xl font-semibold">Achievements & Goals</h1>
        </div>

        {/* Streak card */}
        <Card className="border-orange-500/30 bg-gradient-to-r from-orange-950/30 to-red-950/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="text-5xl">{streak >= 7 ? "🚀" : streak >= 3 ? "🔥" : "📅"}</div>
            <div>
              <p className="text-2xl font-black">{streak} day{streak !== 1 ? "s" : ""}</p>
              <p className="text-sm text-muted-foreground">Current watch streak</p>
              {streak >= 7 && <Badge className="mt-1 bg-orange-500">Week Warrior!</Badge>}
              {streak >= 3 && streak < 7 && <Badge className="mt-1 bg-red-500">On a Roll!</Badge>}
            </div>
          </CardContent>
        </Card>

        {/* Watch Goals */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" /> Watch Goals {new Date().getFullYear()}
              </CardTitle>
              <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" /> Set Goal</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Set a Watch Goal</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category</label>
                      <Select value={newGoal.type} onValueChange={v => setNewGoal(g => ({ ...g, type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="movies">Movies</SelectItem>
                          <SelectItem value="series">Series</SelectItem>
                          <SelectItem value="total">Total (Movies + Series)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Target number</label>
                      <Input type="number" min={1} placeholder="e.g. 50" value={newGoal.target}
                        onChange={e => setNewGoal(g => ({ ...g, target: e.target.value }))} />
                    </div>
                    <Button className="w-full" onClick={() => addGoalMutation.mutate()}
                      disabled={!newGoal.target || addGoalMutation.isPending}>
                      {addGoalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set Goal"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No goals set yet. Add a watch goal above!</p>
            ) : (
              goals.map(goal => {
                const pct = Math.min(100, Math.round((completedCount / goal.target) * 100));
                return (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{goal.type} goal — {goal.target}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{completedCount}/{goal.target}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteGoalMutation.mutate(goal.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <Progress value={pct} className="h-2" />
                    {pct >= 100 && (
                      <Badge className="bg-green-600">🎉 Goal reached!</Badge>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Random Picker */}
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">🎲 What should I watch?</p>
              <p className="text-sm text-muted-foreground">Randomly pick from your watchlist</p>
            </div>
            <Button variant="secondary" onClick={pickRandom}>
              <Shuffle className="h-4 w-4 mr-2" /> Pick One
            </Button>
          </CardContent>
        </Card>

        {/* Random pick dialog */}
        <Dialog open={pickOpen} onOpenChange={setPickOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>🎲 Tonight's Pick</DialogTitle></DialogHeader>
            {randomPick ? (
              <div className="flex gap-4 items-start pt-2">
                {randomPick.posterUrl && (
                  <img src={randomPick.posterUrl} alt={randomPick.title} className="w-20 h-28 object-cover rounded-lg" />
                )}
                <div>
                  <p className="text-xl font-bold">{randomPick.title}</p>
                  <Badge variant="outline" className="mt-1 capitalize">{randomPick.type}</Badge>
                  <p className="text-sm text-muted-foreground mt-3">Go watch this tonight! 🍿</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground py-4">Your Plan to Watch list is empty. Add some titles first!</p>
            )}
          </DialogContent>
        </Dialog>

        {/* Achievements grid */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Badges</h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(ACHIEVEMENT_CATALOG).map(([key, info]) => {
              const isEarned = earnedKeys.has(key);
              const earnedAt = earned.find(a => a.achievementKey === key)?.earnedAt;
              return (
                <Card key={key} className={`transition-all ${isEarned ? "border-yellow-500/40 bg-yellow-950/10" : "opacity-40 grayscale"}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="text-3xl">{info.emoji}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{info.label}</p>
                      <p className="text-xs text-muted-foreground leading-tight">{info.description}</p>
                      {isEarned && earnedAt && (
                        <p className="text-xs text-yellow-500 mt-0.5">
                          ✓ {new Date(earnedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

      </div>
    </Layout>
  );
}
