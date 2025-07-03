import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

function getTournamentTypeLabel(type: string): string {
  switch (type.toLowerCase()) {
    case 'major':
      return 'Major';
    case 'tour':
      return 'Tour';
    case 'league':
      return 'League';
    case 'supr':
      return 'SUPR';
    default:
      return type;
  }
}

// Helper function to format position with tie prefix
function formatPosition(position: number, isTied: boolean): string {
  return isTied ? `T${position}` : position.toString();
}

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  if (k >= 11 && k <= 13) {
    return 'th';
  }
  switch (j) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

interface TournamentResultsProps {
  id?: string;
}

export default function TournamentResults({ id }: TournamentResultsProps) {
  const tournamentId = id ? parseInt(id) : null;
  const [activeTab, setActiveTab] = useState<"net" | "gross">("net");
  
  // Early return if no valid tournament ID
  if (!tournamentId || tournamentId <= 0) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-neutral-600">Invalid tournament ID</p>
      </div>
    );
  }
  
  // Fetch tournament details
  const { data: tournament, isLoading: tournamentLoading } = useQuery({
    queryKey: ['/api/tournaments', tournamentId],
  });
  
  // Fetch tournament results - THIS IS THE KEY FIX
  const { data: tournamentResults, isLoading: resultsLoading } = useQuery({
    queryKey: [`/api/tournaments/${tournamentId}/results`],
  });

  const isLoading = tournamentLoading || resultsLoading;
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-neutral-600">Loading tournament results...</p>
      </div>
    );
  }
  
  // Show error if tournament not found
  if (!tournament) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-neutral-600">Tournament not found</p>
      </div>
    );
  }
  
  // Show error if results not found
  if (!tournamentResults || !Array.isArray(tournamentResults)) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-neutral-600">No tournament results found</p>
      </div>
    );
  }

  // Sort results for NET leaderboard by net score (lower is better), then by handicap (lower first)
  const netResults = [...tournamentResults].sort((a, b) => {
    const scoreA = a?.netScore !== null && a?.netScore !== undefined ? a.netScore : 999;
    const scoreB = b?.netScore !== null && b?.netScore !== undefined ? b.netScore : 999;
    
    // Primary sort: by net score
    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }
    
    // Secondary sort: by handicap (lower handicap first for tied scores)
    const handicapA = a?.handicap !== null && a?.handicap !== undefined ? a.handicap : 999;
    const handicapB = b?.handicap !== null && b?.handicap !== undefined ? b.handicap : 999;
    return handicapA - handicapB;
  });

  // Sort results for GROSS leaderboard by gross score (lower is better), then by handicap (lower first)
  const grossResults = [...tournamentResults].sort((a, b) => {
    const scoreA = a?.grossScore !== null && a?.grossScore !== undefined ? a.grossScore : 999;
    const scoreB = b?.grossScore !== null && b?.grossScore !== undefined ? b.grossScore : 999;
    
    // Primary sort: by gross score
    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }
    
    // Secondary sort: by handicap (lower handicap first for tied scores)
    const handicapA = a?.handicap !== null && a?.handicap !== undefined ? a.handicap : 999;
    const handicapB = b?.handicap !== null && b?.handicap !== undefined ? b.handicap : 999;
    return handicapA - handicapB;
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-heading font-bold">{typeof tournament === 'object' && 'name' in tournament ? String(tournament.name) : 'Tournament'}</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-neutral-600">{typeof tournament === 'object' && 'date' in tournament && tournament.date ? format(new Date(String(tournament.date)), 'MMM d, yyyy') : ''}</p>
            {typeof tournament === 'object' && 'type' in tournament && tournament.type && (
              <Badge variant={String(tournament.type) as any}>{getTournamentTypeLabel(String(tournament.type))}</Badge>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={() => window.history.back()}>Back</Button>
      </div>
      
      {/* Tab navigation */}
      <div className="flex space-x-1 p-1 bg-gray-100 rounded-lg max-w-fit">
        <button
          onClick={() => setActiveTab("net")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "net"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          Net
        </button>
        <button
          onClick={() => setActiveTab("gross")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "gross"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          Gross
        </button>
      </div>

      <Separator />
      
      {/* NET Leaderboard */}
      {activeTab === "net" && (
        <Card>
          <CardHeader>
            <CardTitle>Net Leaderboard</CardTitle>
            <CardDescription>
              Net score leaderboard ordered by position from tournament upload. Points based on tournament type ({typeof tournament === 'object' && 'type' in tournament ? String(tournament.type) : ''}).
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto scrollbar-thin scrollbar-thumb-rounded bg-white p-0">
            <div className="min-w-[600px]">
              <table className="w-full text-sm text-left border-separate border-spacing-0">
                <thead className="bg-neutral-100 sticky top-0 z-10">
                  <tr>
                    <th className="py-2 pl-4 pr-2 font-semibold text-neutral-700 min-w-[48px] text-left sticky left-0 bg-neutral-100 z-20">Pos</th>
                    <th className="px-2 py-2 font-semibold text-neutral-700 min-w-[140px] text-left">Player</th>
                    <th className="px-2 py-2 font-semibold text-neutral-700 min-w-[60px] text-center">Gross</th>
                    <th className="px-2 py-2 font-semibold text-neutral-700 min-w-[60px] text-center">Net</th>
                    <th className="px-2 py-2 font-semibold text-neutral-700 min-w-[70px] text-center">Handicap</th>
                    <th className="px-2 py-2 font-semibold text-neutral-700 min-w-[70px] text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {netResults.map((result, index) => {
                    const isTied = netResults.filter(r => r?.netScore === result?.netScore).length > 1;
                    let position = index + 1;
                    if (isTied) {
                      position = netResults.findIndex(r => r?.netScore === result?.netScore) + 1;
                    }
                    return (
                      <tr key={result?.id || 'unknown'}>
                        <td className="font-semibold">{isTied ? `T${position}` : position.toString()}</td>
                        <td>
                          <a 
                            href={`/player/${result?.player?.id || '#'}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            onClick={e => {
                              e.preventDefault();
                              window.location.href = `/player/${result?.player?.id || '#'}`;
                            }}
                          >
                            {result?.player?.name || 'Unknown'}
                          </a>
                        </td>
                        <td className="text-center">{result?.grossScore !== null && result?.grossScore !== undefined ? result.grossScore : "N/A"}</td>
                        <td className="text-center">{result?.netScore !== null && result?.netScore !== undefined ? result.netScore : "N/A"}</td>
                        <td className="text-center">{result?.handicap !== null && result?.handicap !== undefined ? result.handicap : "N/A"}</td>
                        <td className="text-right font-semibold">{result?.points || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* GROSS Leaderboard */}
      {activeTab === "gross" && (
        <Card>
          <CardHeader>
            <CardTitle>Gross Leaderboard</CardTitle>
            <CardDescription>
              Gross score leaderboard showing stored gross points from database.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto scrollbar-thin scrollbar-thumb-rounded bg-white p-0">
            <div className="min-w-[600px]">
              <table className="w-full text-sm text-left border-separate border-spacing-0">
                <thead className="bg-neutral-100 sticky top-0 z-10">
                  <tr>
                    <th className="py-2 pl-4 pr-2 font-semibold text-neutral-700 min-w-[48px] text-left sticky left-0 bg-neutral-100 z-20">Pos</th>
                    <th className="px-2 py-2 font-semibold text-neutral-700 min-w-[140px] text-left">Player</th>
                    <th className="px-2 py-2 font-semibold text-neutral-700 min-w-[60px] text-center">Gross</th>
                    <th className="px-2 py-2 font-semibold text-neutral-700 min-w-[60px] text-center">Net</th>
                    <th className="px-2 py-2 font-semibold text-neutral-700 min-w-[70px] text-center">Handicap</th>
                    <th className="px-2 py-2 font-semibold text-neutral-700 min-w-[70px] text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {grossResults.map((result, index) => {
                    const isTied = grossResults.filter(r => r?.grossScore === result?.grossScore).length > 1;
                    let position = index + 1;
                    if (isTied) {
                      position = grossResults.findIndex(r => r?.grossScore === result?.grossScore) + 1;
                    }
                    return (
                      <tr key={result?.id || 'unknown'}>
                        <td className="font-semibold">{isTied ? `T${position}` : position.toString()}</td>
                        <td>
                          <a 
                            href={`/player/${result?.player?.id || '#'}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            onClick={e => {
                              e.preventDefault();
                              window.location.href = `/player/${result?.player?.id || '#'}`;
                            }}
                          >
                            {result?.player?.name || 'Unknown'}
                          </a>
                        </td>
                        <td className="text-center">{result?.grossScore !== null && result?.grossScore !== undefined ? result.grossScore : "N/A"}</td>
                        <td className="text-center">{result?.netScore !== null && result?.netScore !== undefined ? result.netScore : "N/A"}</td>
                        <td className="text-center">{result?.handicap !== null && result?.handicap !== undefined ? result.handicap : "N/A"}</td>
                        <td className="text-right font-semibold">{result?.grossPoints || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}