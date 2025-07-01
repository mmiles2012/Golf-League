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
import { formatDate } from "date-fns";

function getOrdinalSuffix(num: number): string {
  const lastDigit = num % 10;
  const lastTwoDigits = num % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return "th";
  }
  
  switch (lastDigit) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

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

interface TournamentResultsProps {
  id?: string;
}

export default function TournamentResults({ id }: TournamentResultsProps) {
  console.log("TournamentResults received id:", id);
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
  
  // Fetch tournament results
  const { data: results, isLoading: resultsLoading } = useQuery({
    queryKey: ['/api/tournaments', tournamentId, 'results'],
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
  if (!results) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-neutral-600">Tournament results not found</p>
      </div>
    );
  }
  
  // For NET leaderboard: use stored positions from database and detect ties by comparing net scores
  const netLeaderboardWithPositions = results && Array.isArray(results)
    ? [...results]
        .filter(result => result?.netScore !== null)
        .sort((a, b) => (a?.position || 0) - (b?.position || 0)) // Sort by stored position from database
        .map((result, index, sortedResults) => {
          // Detect if this position is tied by checking adjacent players with same net score
          const isTied = (
            (index > 0 && sortedResults[index - 1]?.netScore === result?.netScore) ||
            (index < sortedResults.length - 1 && sortedResults[index + 1]?.netScore === result?.netScore)
          );
          
          const actualPosition = result?.position || 0;
          
          return {
            ...result,
            actualPosition,
            displayPosition: isTied ? `T${actualPosition}` : actualPosition.toString(),
            isTied
          };
        })
    : [];
  
  // For GROSS leaderboard: calculate gross scores and positions from net scores
  const grossLeaderboardWithPositions = results && Array.isArray(results)
    ? [...results]
        .filter(result => result?.netScore !== null && result?.handicap !== null)
        .map(result => ({
          ...result,
          grossScore: (result?.netScore || 0) + (result?.handicap || 0)
        }))
        .sort((a, b) => (a?.grossScore || 0) - (b?.grossScore || 0))
        .map((result, index, sortedResults) => {
          // Detect if this position is tied by checking adjacent players with same gross score
          const isTied = (
            (index > 0 && sortedResults[index - 1]?.grossScore === result?.grossScore) ||
            (index < sortedResults.length - 1 && sortedResults[index + 1]?.grossScore === result?.grossScore)
          );
          
          const actualPosition = index + 1;
          
          return {
            ...result,
            actualPosition,
            displayPosition: isTied ? `T${actualPosition}` : actualPosition.toString(),
            isTied
          };
        })
    : [];
  
  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-heading font-bold">{tournament?.name || 'Tournament'}</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-neutral-600">{tournament?.date ? formatDate(tournament.date) : ''}</p>
            {tournament?.type && <Badge variant={tournament.type as any}>{getTournamentTypeLabel(tournament.type)}</Badge>}
          </div>
        </div>
        <Button variant="outline" onClick={() => window.history.back()}>Back</Button>
      </div>
      
      {/* Tab navigation at the top */}
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
              Net score leaderboard ordered by position from tournament upload. Points based on tournament type ({tournament?.type}).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center">Gross</TableHead>
                  <TableHead className="text-center">Net</TableHead>
                  <TableHead className="text-center">Handicap</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {netLeaderboardWithPositions.map((result, index) => {
                  // Use actual points from database (includes tie averaging)
                  const netPoints = result?.points || 0;
                    
                  return (
                    <TableRow key={result?.id || index}>
                      <TableCell className="font-semibold">
                        <span className={result?.isTied ? "text-orange-600" : ""}>
                          {result?.displayPosition}
                          {!result?.isTied && <sup>{getOrdinalSuffix(result?.actualPosition || 0)}</sup>}
                        </span>
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
                      <TableCell className="text-center">
                        {result?.grossScore ?? "N/A"}
                      </TableCell>
                      <TableCell className="text-center">
                        {result?.netScore ?? "N/A"}
                      </TableCell>
                      <TableCell className="text-center">
                        {result?.handicap !== null ? result?.handicap : "N/A"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {netPoints}
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
              Gross score leaderboard calculated from net scores + handicaps. Points based on gross score positions using Tour points.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center">Gross</TableHead>
                  <TableHead className="text-center">Net</TableHead>
                  <TableHead className="text-center">Handicap</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grossLeaderboardWithPositions.map((result, index) => {
                  // Use gross points for gross leaderboard
                  const grossPoints = result?.grossPoints || 0;
                    
                  return (
                    <TableRow key={result?.id || index}>
                      <TableCell className="font-semibold">
                        <span className={result?.isTied ? "text-orange-600" : ""}>
                          {result?.displayPosition}
                          {!result?.isTied && <sup>{getOrdinalSuffix(result?.actualPosition || 0)}</sup>}
                        </span>
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
                      <TableCell className="text-center">
                        {result?.grossScore ?? "N/A"}
                      </TableCell>
                      <TableCell className="text-center">
                        {result?.netScore ?? "N/A"}
                      </TableCell>
                      <TableCell className="text-center">
                        {result?.handicap !== null ? result?.handicap : "N/A"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {grossPoints}
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