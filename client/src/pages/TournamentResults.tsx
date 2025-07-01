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

function formatPosition(position: number, isTied: boolean): string {
  return isTied ? `T${position}` : position.toString();
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
  if (!results || !Array.isArray(results)) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-neutral-600">No tournament results found</p>
      </div>
    );
  }

  // Sort results by position for NET leaderboard (use stored position from database)
  const netResults = [...results]
    .filter(result => result?.netScore !== null && result?.netScore !== undefined)
    .sort((a, b) => (a?.position || 0) - (b?.position || 0));

  // Sort results by gross score for GROSS leaderboard (calculate gross position)
  const grossResults = [...results]
    .filter(result => result?.netScore !== null && result?.netScore !== undefined && 
                      result?.handicap !== null && result?.handicap !== undefined)
    .map(result => ({
      ...result,
      grossScore: (result?.netScore || 0) + (result?.handicap || 0)
    }))
    .sort((a, b) => (a?.grossScore || 0) - (b?.grossScore || 0))
    .map((result, index) => ({
      ...result,
      grossPosition: index + 1
    }));

  // Debug logging
  console.log("Tournament results data:", results);
  console.log("Filtered net results:", netResults);
  console.log("Filtered gross results:", grossResults);
  
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
                {netResults.map((result) => {
                  // Check if this position is tied by looking for other players with the same position
                  const isTied = netResults.filter(r => r?.position === result?.position).length > 1;
                  
                  return (
                    <TableRow key={result?.id}>
                      <TableCell className="font-semibold">
                        <span className={isTied ? "text-orange-600" : ""}>
                          {formatPosition(result?.position || 0, isTied)}
                          {!isTied && <sup>{getOrdinalSuffix(result?.position || 0)}</sup>}
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
                        {(result?.netScore || 0) + (result?.handicap || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        {result?.netScore ?? "N/A"}
                      </TableCell>
                      <TableCell className="text-center">
                        {result?.handicap !== null ? result?.handicap : "N/A"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
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
                {grossResults.map((result) => {
                  // Check if this gross position is tied
                  const isTied = grossResults.filter(r => r?.grossScore === result?.grossScore).length > 1;
                  
                  return (
                    <TableRow key={result?.id}>
                      <TableCell className="font-semibold">
                        <span className={isTied ? "text-orange-600" : ""}>
                          {formatPosition(result?.grossPosition || 0, isTied)}
                          {!isTied && <sup>{getOrdinalSuffix(result?.grossPosition || 0)}</sup>}
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