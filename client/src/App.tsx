import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import AppShell from "@/components/layout/AppShell";
import Login from "@/pages/Login";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Dashboard from "@/pages/Dashboard-fixed";
import Leaderboards from "@/pages/Leaderboards";
import UploadScores from "@/pages/UploadScores";
import ManualEntry from "@/pages/ManualEntry";
import TournamentManagement from "@/pages/TournamentManagement";
import TournamentResults from "@/pages/TournamentResults";
import AllTournamentResults from "@/pages/AllTournamentResults";
import EditTournament from "@/pages/EditTournament";
import Embed from "@/pages/Embed";
import Players from "@/pages/Players";
import PlayerProfile from "@/pages/PlayerProfile";
import PublicLeaderboard from "@/pages/PublicLeaderboard";
import PointsConfiguration from "@/pages/PointsConfiguration";
import SetupPage from "@/pages/SetupPage";
import LeagueManagement from "@/pages/LeagueManagement";

function Router() {
  return (
    <Switch>
      {/* Authentication Route */}
      <Route path="/login" component={Login} />
      
      {/* Main Routes (available to both authenticated users and public viewers) */}
      <Route path="/" component={Leaderboards} />
      <Route path="/tournament-results" component={AllTournamentResults} />
      <Route path="/players" component={Players} />
      
      {/* Admin-only Routes - Protected */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/upload">
        <ProtectedRoute>
          <UploadScores />
        </ProtectedRoute>
      </Route>
      <Route path="/upload-scores">
        <ProtectedRoute>
          <UploadScores />
        </ProtectedRoute>
      </Route>
      <Route path="/manual-entry">
        <ProtectedRoute>
          <ManualEntry />
        </ProtectedRoute>
      </Route>
      <Route path="/tournaments">
        <ProtectedRoute>
          <TournamentManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/points-config">
        <ProtectedRoute>
          <PointsConfiguration />
        </ProtectedRoute>
      </Route>
      <Route path="/setup">
        <ProtectedRoute>
          <SetupPage />
        </ProtectedRoute>
      </Route>
      
      {/* Player Profile */}
      <Route path="/player/:id">
        {params => <PlayerProfile id={parseInt(params.id)} />}
      </Route>
      
      {/* Tournament Routes */}
      <Route path="/tournament/:id">
        {params => <TournamentResults />}
      </Route>
      
      <Route path="/tournament/edit/:id">
        {params => (
          <ProtectedRoute>
            <EditTournament />
          </ProtectedRoute>
        )}
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
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <AppShell>
            <Router />
          </AppShell>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
