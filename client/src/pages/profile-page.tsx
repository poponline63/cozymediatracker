import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import MovieGrid from "@/components/movie-grid";
import Layout from "@/components/layout";
import type { Watchlist } from "@shared/schema";
import { BarChart3, User } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function ProfilePage() {
  const { data: watchlist, isLoading } = useQuery<Watchlist[]>({
    queryKey: ["/api/watchlist"],
  });

  const watching = watchlist?.filter((item) => item.status === "watching") || [];
  const planToWatch = watchlist?.filter((item) => item.status === "plan_to_watch") || [];

  // Calculate completion statistics
  const totalItems = watching.length;
  const completedItems = watching.filter(item => item.progress === 100).length;
  const inProgressItems = watching.filter(item => item.progress && item.progress > 0 && item.progress < 100).length;
  const notStartedItems = totalItems - completedItems - inProgressItems;

  const chartData = [
    { name: "Completed", value: completedItems, color: "#22c55e" },
    { name: "In Progress", value: inProgressItems, color: "#3b82f6" },
    { name: "Not Started", value: notStartedItems, color: "#6b7280" },
  ].filter(item => item.value > 0);

  return (
    <Layout>
      <div className="max-w-screen-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <User className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-semibold">My Profile</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            {watchlist?.length || 0} items in watchlist
          </p>
        </div>

        <div className="mb-8 p-6 border rounded-lg bg-card">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <h2 className="text-lg font-semibold">Your Media Progress</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {chartData.map(({ name, value, color }) => (
                  <div key={name} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-sm font-medium">{name}</span>
                    </div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-sm text-muted-foreground">
                      {Math.round((value / totalItems) * 100)}% of total
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-[200px]">
              {chartData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="watching" className="space-y-4">
          <TabsList>
            <TabsTrigger value="watching">
              Currently Watching ({watching.length})
            </TabsTrigger>
            <TabsTrigger value="plan_to_watch">
              Plan to Watch ({planToWatch.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="watching" className="space-y-4">
            <MovieGrid
              items={watching}
              isLoading={isLoading}
              showProgress
              showRemove
            />
          </TabsContent>

          <TabsContent value="plan_to_watch" className="space-y-4">
            <MovieGrid
              items={planToWatch}
              isLoading={isLoading}
              showProgress
              showRemove
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}