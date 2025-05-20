import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { PlayerWithHistory } from "@shared/schema";

interface PlayerProfileProps {
  id: number;
}

export default function PlayerProfile({ id }: PlayerProfileProps) {
  const [, setLocation] = useLocation();
  
  // Fetch player history data
  const { data: playerHistory, isLoading, error } = useQuery<PlayerWithHistory>({
    queryKey: [`/api/players/${id}/history`],
    staleTime: 60 * 1000, // 1 minute
  });
  
  // Redirect to not found if player doesn't exist
  useEffect(() => {
    if (error) {
      setLocation("/not-found");
    }
  }, [error, setLocation]);
  
  // Get best finish position
  const getBestFinish = () => {
    if (!playerHistory || !playerHistory.tournaments.length) return "N/A";
    
    const bestPosition = Math.min(...playerHistory.tournaments.map(t => t.position));
    return `${bestPosition}${getOrdinalSuffix(bestPosition)}`;
  };
  
  // Get tournament type badge variant
  const getTournamentTypeVariant = (type: string) => {
    switch (type) {
      case 'major':
        return 'major';
      case 'tour':
        return 'tour';
      case 'league':
        return 'league';
      case 'supr':
        return 'supr';
      default:
        return 'default';
    }
  };
  
  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/leaderboards">
            <Button variant="ghost" className="mb-2 p-0 hover:bg-transparent">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Leaderboards
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-neutral-800">
            {isLoading ? <Skeleton className="h-8 w-48" /> : playerHistory?.player.name}
          </h1>
          <p className="text-neutral-600">Player Performance</p>
        </div>
      </div>
      
      {/* Removed Player Stats Cards as requested */}
      
      {/* Point Breakdown Card */}
      <Card>
        <div className="px-5 py-4 border-b border-neutral-200">
          <h3 className="font-heading font-bold text-lg">Points Breakdown</h3>
        </div>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-purple-50 rounded-md p-4">
              <p className="text-sm text-purple-800 font-medium">Major Points</p>
              {isLoading ? (
                <Skeleton className="h-8 w-24 mt-1" />
              ) : (
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  {playerHistory?.majorPoints.toLocaleString() || "0"}
                </p>
              )}
            </div>
            <div className="bg-blue-50 rounded-md p-4">
              <p className="text-sm text-blue-800 font-medium">Tour Points</p>
              {isLoading ? (
                <Skeleton className="h-8 w-24 mt-1" />
              ) : (
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {playerHistory?.tourPoints.toLocaleString() || "0"}
                </p>
              )}
            </div>
            <div className="bg-green-50 rounded-md p-4">
              <p className="text-sm text-green-800 font-medium">League Points</p>
              {isLoading ? (
                <Skeleton className="h-8 w-24 mt-1" />
              ) : (
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {playerHistory?.leaguePoints.toLocaleString() || "0"}
                </p>
              )}
            </div>
            <div className="bg-yellow-50 rounded-md p-4">
              <p className="text-sm text-yellow-800 font-medium">SUPR Points</p>
              {isLoading ? (
                <Skeleton className="h-8 w-24 mt-1" />
              ) : (
                <p className="text-2xl font-bold text-yellow-900 mt-1">
                  {playerHistory?.suprPoints.toLocaleString() || "0"}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tournament History */}
      <Card>
        <div className="px-5 py-4 border-b border-neutral-200">
          <h3 className="font-heading font-bold text-lg">Tournament History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-100">
                <th className="py-2 pl-5 pr-2 text-left text-sm font-medium text-neutral-700">Tournament</th>
                <th className="px-2 py-2 text-left text-sm font-medium text-neutral-700">Date</th>
                <th className="px-2 py-2 text-left text-sm font-medium text-neutral-700">Type</th>
                <th className="px-2 py-2 text-center text-sm font-medium text-neutral-700">Net Pos</th>
                <th className="px-2 py-2 text-center text-sm font-medium text-neutral-700">Gross Pos</th>
                <th className="px-2 py-2 text-center text-sm font-medium text-neutral-700">Gross</th>
                <th className="px-2 py-2 text-center text-sm font-medium text-neutral-700">Net</th>
                <th className="px-2 py-2 text-center text-sm font-medium text-neutral-700">Gross Points</th>
                <th className="px-2 py-2 text-center text-sm font-medium text-neutral-700">Net Points</th>
                <th className="px-2 py-2 text-right text-sm font-medium text-neutral-700">Total Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {isLoading ? (
                Array(5).fill(0).map((_, index) => (
                  <tr key={index}>
                    <td className="py-3 pl-5 pr-2 whitespace-nowrap">
                      <Skeleton className="h-5 w-40" />
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <Skeleton className="h-5 w-24" />
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <Skeleton className="h-5 w-16" />
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center">
                      <Skeleton className="h-5 w-8 mx-auto" />
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center">
                      <Skeleton className="h-5 w-8 mx-auto" />
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center">
                      <Skeleton className="h-5 w-12 mx-auto" />
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center">
                      <Skeleton className="h-5 w-12 mx-auto" />
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center">
                      <Skeleton className="h-5 w-12 mx-auto" />
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-center">
                      <Skeleton className="h-5 w-12 mx-auto" />
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-right">
                      <Skeleton className="h-5 w-16 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : playerHistory && playerHistory.tournaments.length > 0 ? (
                // Sort tournaments by date descending
                [...playerHistory.tournaments]
                  .sort((a, b) => new Date(b.tournamentDate).getTime() - new Date(a.tournamentDate).getTime())
                  .map((tournament) => (
                    <tr key={tournament.id}>
                      <td className="py-3 pl-5 pr-2 whitespace-nowrap text-sm font-medium">
                        {tournament.tournamentName}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm">
                        {formatDate(tournament.tournamentDate)}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm">
                        <Badge variant={getTournamentTypeVariant(tournament.tournamentType)}>
                          {tournament.tournamentType.charAt(0).toUpperCase() + tournament.tournamentType.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-center">
                        {tournament.position}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-center">
                        {tournament.grossPosition || "N/A"}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-center">
                        {tournament.grossScore || "N/A"}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-center">
                        {tournament.netScore || "N/A"}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-center">
                        {tournament.tournamentType === 'tour' && tournament.grossPosition && tournament.grossPosition <= 3 
                          ? tournament.points : "0"}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-center">
                        {tournament.tournamentType !== 'tour' || !tournament.grossPosition || tournament.grossPosition > 3 
                          ? tournament.points : "0"}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-right font-medium">
                        {tournament.points.toLocaleString()}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-neutral-500">
                    No tournament history available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}

// Helper function to get ordinal suffix for numbers
function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  
  if (j === 1 && k !== 11) {
    return "st";
  }
  if (j === 2 && k !== 12) {
    return "nd";
  }
  if (j === 3 && k !== 13) {
    return "rd";
  }
  return "th";
}
