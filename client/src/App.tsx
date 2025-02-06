import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import TabNavigation from "@/components/tab-navigation";
import HomePage from "@/pages/home-page";
import SearchPage from "@/pages/search-page";
import FriendsPage from "@/pages/friends-page";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="pb-[72px] min-h-screen bg-background">
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/search" component={SearchPage} />
        <Route path="/friends" component={FriendsPage} />
        <Route component={NotFound} />
      </Switch>
      <TabNavigation />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;