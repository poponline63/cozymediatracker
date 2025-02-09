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

// Assuming type definitions for Statistics and WatchSession exist elsewhere
// in the project.  These would need to be defined or imported.
interface Statistics {
  totalWatchtime?: number;
  totalItems?: number;
  averageDailyWatchtime?: number;
  averageRating?: number;
  ratedItems?: number;
  watchTimeByDay?: { day: string; hours: number }[];
}

interface WatchSession {
  id: string;
  title: string;
  duration: number;
  startTime: string;
}


export default function StatisticsPage() {
  const { data: stats, isLoading } = useQuery<Statistics>({
    queryKey: ["/api/statistics"],
  });

  const { data: watchSessions } = useQuery<WatchSession[]>({
    queryKey: ["/api/statistics/watch-sessions"],
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8">Loading statistics...</div>
      </Layout>
    );
  }

  const totalWatchtime = stats?.totalWatchtime || 0;
  const totalItems = stats?.totalItems || 0;
  const averageDailyWatchtime = Math.round(stats?.averageDailyWatchtime || 0);
  const averageRating = stats?.averageRating || 0; //Added for better error handling
  const ratedItems = stats?.ratedItems || 0; //Added for better error handling
  const watchTimeByDay = stats?.watchTimeByDay || [];


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
                {Math.floor(totalWatchtime / 60)}h {totalWatchtime % 60}m
              </div>
              <p className="text-xs text-muted-foreground">
                Across {totalItems} items
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
                {averageDailyWatchtime}m
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
                {averageRating.toFixed(1)} / 5.0
              </div>
              <p className="text-xs text-muted-foreground">
                From {ratedItems} ratings
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
                <BarChart data={watchTimeByDay}>
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