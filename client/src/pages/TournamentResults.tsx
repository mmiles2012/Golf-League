import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Pos</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center w-20">Gross</TableHead>
                  <TableHead className="text-center w-20">Net</TableHead>
                  <TableHead className="text-center w-24">Handicap</TableHead>
                  <TableHead className="text-right w-24">Net Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {netResults.map((result, index) => {
                  // Check if this net score is tied by looking for other players with the same net score
                  const isTied = netResults.filter(r => r?.netScore === result?.netScore).length > 1;
                  
                  // Calculate proper tied position - find the first occurrence of this score
                  let position = index + 1;
                  if (isTied) {
                    position = netResults.findIndex(r => r?.netScore === result?.netScore) + 1;
                  }
                  
                  return (
                  <TableRow key={result?.id || 'unknown'}>
                    <TableCell className="font-semibold w-16">
                      {isTied ? `T${position}` : position.toString()}
                    </TableCell>
                    <TableCell>
                      <a 
                        href={`/player/${result?.player?.id || '#'}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          if (result?.player?.id) {
                            window.location.href = `/player/${result.player.id}`;
                          }
                        }}
                      >
                        {result?.player?.name || 'Unknown Player'}
                      </a>
                    </TableCell>
                    <TableCell className="text-center w-20">
                      {result?.grossScore !== null && result?.grossScore !== undefined ? result.grossScore : "N/A"}
                    </TableCell>
                    <TableCell className="text-center w-20">
                      {result?.netScore !== null && result?.netScore !== undefined ? result.netScore : "N/A"}
                    </TableCell>
                    <TableCell className="text-center w-24">
                      {result?.handicap !== null && result?.handicap !== undefined ? result.handicap : "N/A"}
                    </TableCell>
                    <TableCell className="text-right font-semibold w-24">
                      {result?.points || 0}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Pos</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center w-20">Gross</TableHead>
                  <TableHead className="text-center w-20">Net</TableHead>
                  <TableHead className="text-center w-24">Handicap</TableHead>
                  <TableHead className="text-right w-24">Gross Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grossResults.map((result, index) => {
                  // Check if this gross score is tied by looking for other players with the same gross score
                  const isTied = grossResults.filter(r => r?.grossScore === result?.grossScore).length > 1;
                  
                  // Calculate proper tied position - find the first occurrence of this score
                  let position = index + 1;
                  if (isTied) {
                    position = grossResults.findIndex(r => r?.grossScore === result?.grossScore) + 1;
                  }
                  
                  return (
                    <TableRow key={result?.id || 'unknown'}>
                      <TableCell className="font-semibold w-16">
                        {isTied ? `T${position}` : position.toString()}
                      </TableCell>
                    <TableCell>
                      <a 
                        href={`/player/${result?.player?.id || '#'}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          if (result?.player?.id) {
                            window.location.href = `/player/${result.player.id}`;
                          }
                        }}
                      >
                        {result?.player?.name || 'Unknown Player'}
                      </a>
                    </TableCell>
                    <TableCell className="text-center w-20">
                      {result?.grossScore !== null && result?.grossScore !== undefined ? result.grossScore : "N/A"}
                    </TableCell>
                    <TableCell className="text-center w-20">
                      {result?.netScore !== null && result?.netScore !== undefined ? result.netScore : "N/A"}
                    </TableCell>
                    <TableCell className="text-center w-24">
                      {result?.handicap !== null && result?.handicap !== undefined ? result.handicap : "N/A"}
                    </TableCell>
                    <TableCell className="text-right font-semibold w-24">
                      {result?.grossPoints || 0}
                    </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}