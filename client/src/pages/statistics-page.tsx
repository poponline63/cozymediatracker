import { useQuery } from "@tanstack/react-query";
import { BarChart3, Clock, Calendar, Star } from "lucide-react";
import Layout from "@/components/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#22c55e", "#3b82f6", "#ec4899", "#f59e0b", "#6366f1"];

export default function StatisticsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/statistics"],
  });

  const { data: watchSessions } = useQuery({
    queryKey: ["/api/statistics/watch-sessions"],
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8">Loading statistics...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 space-y-8">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-semibold">Watch Statistics</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Watch Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.floor(stats?.totalWatchtime / 60)}h {stats?.totalWatchtime % 60}m
              </div>
              <p className="text-xs text-muted-foreground">
                Across {stats?.totalItems || 0} items
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Average Daily Watch Time</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.averageDailyWatchtime}m
              </div>
              <p className="text-xs text-muted-foreground">
                Last 7 days
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.averageRating?.toFixed(1)} / 5.0
              </div>
              <p className="text-xs text-muted-foreground">
                From {stats?.ratedItems || 0} ratings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Watch Time Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Watch Time Distribution</CardTitle>
            <CardDescription>Hours spent watching by day of week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.watchTimeByDay || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Watch Sessions</CardTitle>
            <CardDescription>Your latest viewing activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {watchSessions?.map((session: any) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div>
                    <p className="font-medium">{session.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Watched for {Math.floor(session.duration / 60)}h {session.duration % 60}m
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(session.startTime).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
