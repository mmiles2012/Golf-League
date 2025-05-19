import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AppShell from "@/components/layout/AppShell";
import Dashboard from "@/pages/Dashboard";
import Leaderboards from "@/pages/Leaderboards";
import UploadScores from "@/pages/UploadScores";
import ManualEntry from "@/pages/ManualEntry";
import TournamentManagement from "@/pages/TournamentManagement";
import Embed from "@/pages/Embed";
import PlayerProfile from "@/pages/PlayerProfile";
import PublicLeaderboard from "@/pages/PublicLeaderboard";

function Router() {
  return (
    <Switch>
      {/* Main Admin Routes */}
      <Route path="/" component={Dashboard} />
      <Route path="/leaderboards" component={Leaderboards} />
      <Route path="/upload" component={UploadScores} />
      <Route path="/manual-entry" component={ManualEntry} />
      <Route path="/tournaments" component={TournamentManagement} />
      <Route path="/embed" component={Embed} />
      
      {/* Player Profile */}
      <Route path="/player/:id">
        {params => <PlayerProfile id={parseInt(params.id)} />}
      </Route>
      
      {/* Public Routes */}
      <Route path="/public/leaderboard/:type">
        {params => <PublicLeaderboard type={params.type as 'net' | 'gross'} />}
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppShell>
          <Router />
        </AppShell>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
