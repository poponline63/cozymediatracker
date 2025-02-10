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

interface Statistics {
  totalWatchtime: number;
  totalItems: number;
  averageDailyWatchtime: number;
  watchTimeByDay: { day: string; hours: number }[];
  watchTimeByType?: { type: string; hours: number }[];
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
  const watchTimeByDay = stats?.watchTimeByDay || [];
  const watchTimeByType = stats?.watchTimeByType || [];

  const formatWatchTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

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
                {formatWatchTime(totalWatchtime)}
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
                {formatWatchTime(averageDailyWatchtime)}
              </div>
              <p className="text-xs text-muted-foreground">
                Last 7 days
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Watch Time by Type</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={watchTimeByType}
                      dataKey="hours"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={40}
                      paddingAngle={2}
                    >
                      {watchTimeByType.map((entry, index) => (
                        <Cell key={entry.type} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatWatchTime(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
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
                  <Tooltip formatter={(value) => formatWatchTime(Number(value))} />
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
              {watchSessions?.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div>
                    <p className="font-medium">{session.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatWatchTime(session.duration)}
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