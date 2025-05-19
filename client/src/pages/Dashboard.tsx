import React from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, FileUp, Calendar, CalendarCheck, Users, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const { data: netLeaderboard, isLoading: isLoadingNet } = useQuery({
    queryKey: ["/api/leaderboard/net"],
    staleTime: 60 * 1000, // 1 minute
  });
  
  const { data: grossLeaderboard, isLoading: isLoadingGross } = useQuery({
    queryKey: ["/api/leaderboard/gross"],
    staleTime: 60 * 1000, // 1 minute
  });
  
  const { data: tournaments, isLoading: isLoadingTournaments } = useQuery({
    queryKey: ["/api/tournaments"],
    staleTime: 60 * 1000, // 1 minute
  });
  
  // Calculate stats
  const totalPlayers = !isLoadingNet && netLeaderboard ? 
    netLeaderboard.length : 0;
  
  const totalTournaments = !isLoadingTournaments && tournaments ? 
    tournaments.length : 0;
  
  const completedEvents = !isLoadingTournaments && tournaments ? 
    tournaments.filter(t => t.status === 'completed').length : 0;
  
  const upcomingEvents = !isLoadingTournaments && tournaments ? 
    tournaments.filter(t => t.status === 'upcoming').length : 0;
  
  // Get 5 top players for each leaderboard
  const topNetPlayers = !isLoadingNet && netLeaderboard ? 
    netLeaderboard.slice(0, 5) : [];
  
  const topGrossPlayers = !isLoadingGross && grossLeaderboard ? 
    grossLeaderboard.slice(0, 5) : [];
  
  // Get recent activity based on tournament dates
  const recentActivity = !isLoadingTournaments && tournaments ? 
    tournaments
      .filter(t => t.status === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3)
    : [];
  
  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-neutral-800">Dashboard</h1>
          <p className="text-neutral-600">2023 Season Hideout Golf League</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link href="/leaderboards">
            <Button className="inline-flex items-center">
              <Trophy className="mr-2 h-4 w-4" />
              View Leaderboards
            </Button>
          </Link>
          <Link href="/upload">
            <Button variant="secondary" className="inline-flex items-center">
              <FileUp className="mr-2 h-4 w-4" />
              Upload Scores
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-600 text-sm">Total Players</p>
                {isLoadingNet ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <h3 className="text-2xl font-bold">{totalPlayers}</h3>
                )}
              </div>
              <div className="stats-icon primary">
                <Users />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-600 text-sm">Tournaments</p>
                {isLoadingTournaments ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <h3 className="text-2xl font-bold">{totalTournaments}</h3>
                )}
              </div>
              <div className="stats-icon secondary">
                <Flag />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-600 text-sm">Completed Events</p>
                {isLoadingTournaments ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <h3 className="text-2xl font-bold">{completedEvents}</h3>
                )}
              </div>
              <div className="stats-icon accent">
                <CalendarCheck />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-600 text-sm">Upcoming Events</p>
                {isLoadingTournaments ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <h3 className="text-2xl font-bold">{upcomingEvents}</h3>
                )}
              </div>
              <div className="stats-icon neutral">
                <Calendar />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Featured Image */}
      <Card className="overflow-hidden shadow-lg">
        <div className="h-64 overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1535131749006-b7f58c99034b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400&q=80" 
            alt="Golf tournament at sunset" 
            className="w-full h-64 object-cover"
          />
        </div>
        <CardContent className="p-5">
          <h2 className="text-xl font-heading font-bold">2023 Championship Series</h2>
          <p className="text-neutral-600 mt-2">
            Track your progress throughout the season across multiple tournament types: Majors, Tour Events, League matches, and SUPR Club competitions.
          </p>
          <div className="mt-4 flex gap-3">
            <Link href="/leaderboards">
              <a className="text-primary font-medium hover:text-primary-dark flex items-center">
                <span>View Leaderboards</span>
                <span className="ml-1">&rarr;</span>
              </a>
            </Link>
            <Link href="/tournaments">
              <a className="text-primary font-medium hover:text-primary-dark flex items-center">
                <span>Tournament Schedule</span>
                <span className="ml-1">&rarr;</span>
              </a>
            </Link>
          </div>
        </CardContent>
      </Card>
      
      {/* Quick View Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Net Leaderboard Preview */}
        <Card>
          <div className="px-5 py-4 border-b border-neutral-200 flex justify-between items-center">
            <h3 className="font-heading font-bold text-lg">Net Leaderboard</h3>
            <Link href="/leaderboards">
              <a className="text-primary hover:text-primary-dark text-sm font-medium">View Full</a>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-100">
                  <th className="py-2 pl-5 pr-2 text-left text-sm font-medium text-neutral-700">Pos</th>
                  <th className="px-2 py-2 text-left text-sm font-medium text-neutral-700">Player</th>
                  <th className="px-2 py-2 text-left text-sm font-medium text-neutral-700">Events</th>
                  <th className="px-2 py-2 text-right text-sm font-medium text-neutral-700">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {isLoadingNet ? (
                  Array(5).fill(0).map((_, index) => (
                    <tr key={index}>
                      <td className="py-3 pl-5 pr-2 whitespace-nowrap">
                        <Skeleton className="h-4 w-4" />
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <Skeleton className="h-4 w-32" />
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <Skeleton className="h-4 w-8" />
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-right">
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : (
                  topNetPlayers.map((player, index) => (
                    <tr key={player.player.id}>
                      <td className="py-3 pl-5 pr-2 whitespace-nowrap text-sm font-medium">
                        {player.rank}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm">
                        {player.player.name}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm">
                        {player.totalEvents}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-right font-medium">
                        {player.totalPoints.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
        
        {/* Gross Leaderboard Preview */}
        <Card>
          <div className="px-5 py-4 border-b border-neutral-200 flex justify-between items-center">
            <h3 className="font-heading font-bold text-lg">Gross Leaderboard</h3>
            <Link href="/leaderboards">
              <a className="text-primary hover:text-primary-dark text-sm font-medium">View Full</a>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-100">
                  <th className="py-2 pl-5 pr-2 text-left text-sm font-medium text-neutral-700">Pos</th>
                  <th className="px-2 py-2 text-left text-sm font-medium text-neutral-700">Player</th>
                  <th className="px-2 py-2 text-left text-sm font-medium text-neutral-700">Events</th>
                  <th className="px-2 py-2 text-right text-sm font-medium text-neutral-700">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {isLoadingGross ? (
                  Array(5).fill(0).map((_, index) => (
                    <tr key={index}>
                      <td className="py-3 pl-5 pr-2 whitespace-nowrap">
                        <Skeleton className="h-4 w-4" />
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <Skeleton className="h-4 w-32" />
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <Skeleton className="h-4 w-8" />
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-right">
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : (
                  topGrossPlayers.map((player) => (
                    <tr key={player.player.id}>
                      <td className="py-3 pl-5 pr-2 whitespace-nowrap text-sm font-medium">
                        {player.rank}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm">
                        {player.player.name}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm">
                        {player.totalEvents}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-right font-medium">
                        {player.totalPoints.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      
      {/* Recent Activity */}
      <Card>
        <div className="px-5 py-4 border-b border-neutral-200">
          <h3 className="font-heading font-bold text-lg">Recent Activity</h3>
        </div>
        <div>
          <ul className="divide-y divide-neutral-200">
            {isLoadingTournaments ? (
              Array(3).fill(0).map((_, index) => (
                <li key={index} className="px-5 py-4 flex items-start space-x-3">
                  <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-48 mb-1" />
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-3 w-20 mt-1" />
                  </div>
                </li>
              ))
            ) : (
              recentActivity.map((tournament) => {
                let icon, iconClass;
                
                switch (tournament.type) {
                  case 'major':
                    icon = <Trophy className="h-4 w-4" />;
                    iconClass = "bg-accent/20 text-accent-dark";
                    break;
                  case 'tour':
                    icon = <Flag className="h-4 w-4" />;
                    iconClass = "bg-primary/10 text-primary";
                    break;
                  case 'league':
                    icon = <Users className="h-4 w-4" />;
                    iconClass = "bg-secondary/20 text-secondary-dark";
                    break;
                  case 'supr':
                    icon = <CalendarCheck className="h-4 w-4" />;
                    iconClass = "bg-purple-100 text-purple-800";
                    break;
                  default:
                    icon = <Calendar className="h-4 w-4" />;
                    iconClass = "bg-neutral-200 text-neutral-700";
                }
                
                const tournamentDate = new Date(tournament.date);
                const today = new Date();
                const diffTime = Math.abs(today.getTime() - tournamentDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                let timeAgo;
                if (diffDays === 0) {
                  timeAgo = "Today";
                } else if (diffDays === 1) {
                  timeAgo = "Yesterday";
                } else if (diffDays < 7) {
                  timeAgo = `${diffDays} days ago`;
                } else if (diffDays < 30) {
                  const weeks = Math.floor(diffDays / 7);
                  timeAgo = `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
                } else {
                  const months = Math.floor(diffDays / 30);
                  timeAgo = `${months} ${months === 1 ? 'month' : 'months'} ago`;
                }
                
                return (
                  <li key={tournament.id} className="px-5 py-4 flex items-start space-x-3">
                    <div className={`h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center ${iconClass}`}>
                      {icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tournament.name}</p>
                      <p className="text-sm text-neutral-600">
                        {tournament.type.charAt(0).toUpperCase() + tournament.type.slice(1)} event processed
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">{timeAgo}</p>
                    </div>
                  </li>
                );
              })
            )}
            
            {!isLoadingTournaments && recentActivity.length === 0 && (
              <li className="px-5 py-4 text-center">
                <p className="text-sm text-neutral-500">No recent activity</p>
              </li>
            )}
          </ul>
        </div>
      </Card>
    </section>
  );
}
