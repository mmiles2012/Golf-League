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
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-neutral-800">Hi, Coach!</h1>
          <p className="text-neutral-600">Welcome to Hideout Golf League Tracker</p>
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
      
      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* My Golfers Card */}
        <Card className="overflow-hidden">
          <div className="h-40 bg-gradient-to-r from-sky-800 to-blue-700 relative">
            <div className="absolute inset-0 flex items-center px-6">
              <h2 className="text-2xl font-bold text-white">Players</h2>
            </div>
            <div className="absolute bottom-4 right-6">
              <svg className="h-16 w-16 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M18 8C18 12.4183 14.4183 16 10 16C5.58172 16 2 12.4183 2 8C2 3.58172 5.58172 0 10 0C14.4183 0 18 3.58172 18 8Z" transform="translate(3 4)" />
                <path d="M12 16C12 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0C3.58172 0 0 3.58172 0 8C0 12.4183 4 16 4 16" transform="translate(4 4)" />
                <path d="M0 4C0 4 1 1 4 0" transform="translate(4 16)" />
                <path d="M0 0C3 1 4 4 4 4" transform="translate(16 16)" />
              </svg>
            </div>
          </div>
          <CardContent className="p-6">
            <p className="text-neutral-600">
              View and manage all league players and their profiles
            </p>
            <div className="mt-4">
              <Link href="/players">
                <Button variant="ghost" className="p-0 h-auto text-primary font-medium hover:text-primary-dark flex items-center">
                  <span>View all players</span>
                  <span className="ml-1">&rarr;</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        {/* Tournaments Card */}
        <Card className="overflow-hidden">
          <div className="h-40 bg-gradient-to-r from-green-800 to-green-600 relative">
            <div className="absolute inset-0 flex items-center px-6">
              <h2 className="text-2xl font-bold text-white">Tournaments</h2>
            </div>
            <div className="absolute bottom-4 right-6">
              <svg className="h-16 w-16 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M12 18C12 18 16 14.4183 16 10C16 5.58172 12.4183 2 8 2C3.58172 2 0 5.58172 0 10C0 14.4183 4 18 4 18" transform="translate(4 2)" />
                <circle cx="12" cy="10" r="2" fill="currentColor" />
                <path d="M0 0V4" transform="translate(12 0)" />
                <path d="M0 0V4" transform="translate(4 20)" />
                <path d="M0 0V4" transform="translate(20 20)" />
              </svg>
            </div>
          </div>
          <CardContent className="p-6">
            <p className="text-neutral-600">
              Access all tournament information and competition details
            </p>
            <div className="mt-4">
              <Link href="/tournaments">
                <Button variant="ghost" className="p-0 h-auto text-primary font-medium hover:text-primary-dark flex items-center">
                  <span>View tournament schedule</span>
                  <span className="ml-1">&rarr;</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        {/* News Card */}
        <Card className="overflow-hidden">
          <div className="h-40 bg-gradient-to-r from-indigo-800 to-indigo-600 relative">
            <div className="absolute inset-0 flex flex-col justify-center px-6">
              <h2 className="text-2xl font-bold text-white">Exciting news!</h2>
              <p className="text-white/80 mt-1 text-sm">
                We're currently crafting a fantastic new feature to enhance your experience.
              </p>
              <p className="text-white/80 mt-2 text-sm">
                Stay tuned for updates!
              </p>
            </div>
          </div>
          <CardContent className="p-6">
            <p className="text-neutral-600">
              Check back often to discover new league features and improvements
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Quick Summary */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Quick Summary</h3>
          <p className="text-sm text-neutral-600">Your stats at a glance</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-4">
            <h4 className="text-sm text-neutral-600 mb-2">Total Players</h4>
            {isLoadingNet ? (
              <Skeleton className="h-12 w-24 mx-auto" />
            ) : (
              <p className="text-4xl font-bold text-neutral-800">{totalPlayers}</p>
            )}
          </div>
          
          <div className="p-4">
            <h4 className="text-sm text-neutral-600 mb-2">Tournaments</h4>
            {isLoadingTournaments ? (
              <Skeleton className="h-12 w-24 mx-auto" />
            ) : (
              <p className="text-4xl font-bold text-neutral-800">{totalTournaments}</p>
            )}
          </div>
          
          <div className="p-4">
            <h4 className="text-sm text-neutral-600 mb-2">Completed</h4>
            {isLoadingTournaments ? (
              <Skeleton className="h-12 w-24 mx-auto" />
            ) : (
              <p className="text-4xl font-bold text-neutral-800">{completedEvents}</p>
            )}
          </div>
          
          <div className="p-4">
            <h4 className="text-sm text-neutral-600 mb-2">Upcoming</h4>
            {isLoadingTournaments ? (
              <Skeleton className="h-12 w-24 mx-auto" />
            ) : (
              <p className="text-4xl font-bold text-neutral-800">{upcomingEvents}</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Leaderboard */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Leaderboard Standings</h3>
          <Link href="/leaderboards">
            <Button variant="outline" size="sm">View Full Leaderboards</Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Net Leaderboard Preview */}
          <Card>
            <CardContent className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-lg">Net Leaderboard</h4>
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Net Scoring</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="py-2 pl-0 pr-2 text-left text-sm font-medium text-neutral-500">Pos</th>
                      <th className="px-2 py-2 text-left text-sm font-medium text-neutral-500">Player</th>
                      <th className="px-2 py-2 text-center text-sm font-medium text-neutral-500">Events</th>
                      <th className="px-2 py-2 text-right text-sm font-medium text-neutral-500">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingNet ? (
                      Array(5).fill(0).map((_, index) => (
                        <tr key={index} className="border-b border-neutral-100">
                          <td className="py-3 pl-0 pr-2 whitespace-nowrap">
                            <Skeleton className="h-4 w-4" />
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <Skeleton className="h-4 w-32" />
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap text-center">
                            <Skeleton className="h-4 w-8 mx-auto" />
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap text-right">
                            <Skeleton className="h-4 w-16 ml-auto" />
                          </td>
                        </tr>
                      ))
                    ) : (
                      topNetPlayers.map((player, index) => (
                        <tr key={player.player.id} className="border-b border-neutral-100">
                          <td className="py-3 pl-0 pr-2 whitespace-nowrap text-sm font-medium">
                            {player.rank}
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm">
                            <Link href={`/players/${player.player.id}`}>
                              <a className="hover:text-primary font-medium">{player.player.name}</a>
                            </Link>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-center">
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
            </CardContent>
          </Card>
          
          {/* Gross Leaderboard Preview */}
          <Card>
            <CardContent className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-lg">Gross Leaderboard</h4>
                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Gross Scoring</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="py-2 pl-0 pr-2 text-left text-sm font-medium text-neutral-500">Pos</th>
                      <th className="px-2 py-2 text-left text-sm font-medium text-neutral-500">Player</th>
                      <th className="px-2 py-2 text-center text-sm font-medium text-neutral-500">Events</th>
                      <th className="px-2 py-2 text-right text-sm font-medium text-neutral-500">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingGross ? (
                      Array(5).fill(0).map((_, index) => (
                        <tr key={index} className="border-b border-neutral-100">
                          <td className="py-3 pl-0 pr-2 whitespace-nowrap">
                            <Skeleton className="h-4 w-4" />
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap">
                            <Skeleton className="h-4 w-32" />
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap text-center">
                            <Skeleton className="h-4 w-8 mx-auto" />
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap text-right">
                            <Skeleton className="h-4 w-16 ml-auto" />
                          </td>
                        </tr>
                      ))
                    ) : (
                      topGrossPlayers.map((player) => (
                        <tr key={player.player.id} className="border-b border-neutral-100">
                          <td className="py-3 pl-0 pr-2 whitespace-nowrap text-sm font-medium">
                            {player.rank}
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm">
                            <Link href={`/players/${player.player.id}`}>
                              <a className="hover:text-primary font-medium">{player.player.name}</a>
                            </Link>
                          </td>
                          <td className="px-2 py-3 whitespace-nowrap text-sm text-center">
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
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Recent Activity</h3>
          <Link href="/tournaments">
            <Button variant="outline" size="sm">View All Tournaments</Button>
          </Link>
        </div>
        
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-neutral-100">
              {isLoadingTournaments ? (
                Array(3).fill(0).map((_, index) => (
                  <li key={index} className="px-5 py-4 flex items-start space-x-3">
                    <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-48 mb-1" />
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-3 w-20 mt-1" />
                    </div>
                  </li>
                ))
              ) : recentActivity.length > 0 ? (
                recentActivity.map((tournament) => {
                  let icon, iconClass;
                  
                  switch (tournament.type) {
                    case 'major':
                      icon = <Trophy className="h-5 w-5" />;
                      iconClass = "bg-amber-100 text-amber-800";
                      break;
                    case 'tour':
                      icon = <Flag className="h-5 w-5" />;
                      iconClass = "bg-blue-100 text-blue-800";
                      break;
                    case 'league':
                      icon = <Users className="h-5 w-5" />;
                      iconClass = "bg-green-100 text-green-800";
                      break;
                    case 'supr':
                      icon = <CalendarCheck className="h-5 w-5" />;
                      iconClass = "bg-purple-100 text-purple-800";
                      break;
                    default:
                      icon = <Calendar className="h-5 w-5" />;
                      iconClass = "bg-neutral-100 text-neutral-800";
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
                    <li key={tournament.id} className="px-5 py-4 flex items-center gap-4 hover:bg-neutral-50">
                      <div className={`h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center ${iconClass}`}>
                        {icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{tournament.name}</p>
                          <p className="text-xs text-neutral-500">{timeAgo}</p>
                        </div>
                        <p className="text-sm text-neutral-600 mt-1">
                          {tournament.type.charAt(0).toUpperCase() + tournament.type.slice(1)} event completed
                        </p>
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="px-5 py-8 text-center text-neutral-500">
                  <p>No recent tournament activity</p>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}