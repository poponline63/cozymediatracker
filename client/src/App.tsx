import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import HomePage from "./pages/home-page";
import SearchPage from "./pages/search-page";
import FriendsPage from "./pages/friends-page";
import FeedPage from "./pages/feed-page";
import AchievementsPage from "./pages/achievements-page";
import StatisticsPage from "./pages/statistics-page";
import ProfilePage from "./pages/profile-page";
import CustomListsPage from "./pages/custom-lists-page";
import LandingPage from "./pages/landing-page";
import NotFound from "./pages/not-found";
import AuthPage from "./pages/auth-page";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import TabNavigation from "@/components/tab-navigation";
import { useLocation } from "wouter";

function Router() {
  const [location] = useLocation();
  const showNav = location !== "/auth";

  return (
    <div className="min-h-screen bg-background">
      <Switch>
        <Route path="/landing" component={LandingPage} />
        <Route path="/auth" component={AuthPage} />
        {/* /verify-email is handled by the server — redirect handled there */}
        <ProtectedRoute path="/" component={HomePage} />
        <ProtectedRoute path="/search" component={SearchPage} />
        <ProtectedRoute path="/feed" component={FeedPage} />
        <ProtectedRoute path="/friends" component={FriendsPage} />
        <ProtectedRoute path="/lists" component={CustomListsPage} />
        <ProtectedRoute path="/achievements" component={AchievementsPage} />
        <ProtectedRoute path="/statistics" component={StatisticsPage} />
        <ProtectedRoute path="/profile" component={ProfilePage} />
        <Route component={NotFound} />
      </Switch>
      {showNav && <TabNavigation />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
