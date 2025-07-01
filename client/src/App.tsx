import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import AppShell from "@/components/layout/AppShell";
import PlayerDashboard from "@/pages/PlayerDashboard";
import Leaderboards from "@/pages/Leaderboards";
import UploadScores from "@/pages/UploadScores";
import ManualEntry from "@/pages/ManualEntry";
import TournamentManagement from "@/pages/TournamentManagement";
import TournamentResults from "@/pages/TournamentResults";
import AllTournamentResults from "@/pages/AllTournamentResults";
import EditTournament from "@/pages/EditTournament";
import Players from "@/pages/Players";
import PlayerProfile from "@/pages/PlayerProfile";
import PublicLeaderboard from "@/pages/PublicLeaderboard";
import PointsConfiguration from "@/pages/PointsConfiguration";
import SetupPage from "@/pages/SetupPage";
import LeagueManagement from "@/pages/LeagueManagement";

function Router() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  return (
    <Switch>
      {/* Main Routes (available to everyone) */}
      <Route path="/" component={Leaderboards} />
      <Route path="/tournament-results" component={AllTournamentResults} />
      <Route path="/players" component={Players} />
      
      {/* Authenticated Player Routes */}
      <Route path="/dashboard" component={PlayerDashboard} />
      
      {/* Admin-only Routes */}
      {isAdmin && (
        <>
          <Route path="/upload" component={UploadScores} />
          <Route path="/upload-scores" component={UploadScores} />
          <Route path="/manual-entry" component={ManualEntry} />
          <Route path="/tournaments" component={TournamentManagement} />
          <Route path="/points-config" component={PointsConfiguration} />
          <Route path="/setup" component={SetupPage} />
          <Route path="/tournament/edit/:id" component={EditTournament} />
        </>
      )}
      
      {/* Player Profile */}
      <Route path="/player/:id">
        {params => <PlayerProfile id={parseInt(params.id)} />}
      </Route>
      
      {/* Tournament Routes */}
      <Route path="/tournament/:id">
        {params => <TournamentResults id={params.id} />}
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
