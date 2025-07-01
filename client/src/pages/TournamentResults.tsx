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
                  <TableHead>Position</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center">Gross</TableHead>
                  <TableHead className="text-center">Net</TableHead>
                  <TableHead className="text-center">Handicap</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tournamentResults.map((result) => (
                  <TableRow key={result?.id || 'unknown'}>
                    <TableCell className="font-semibold">
                      {result?.position || ''}
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
                      {result?.grossScore !== null && result?.grossScore !== undefined ? result.grossScore : "N/A"}
                    </TableCell>
                    <TableCell className="text-center">
                      {result?.netScore !== null && result?.netScore !== undefined ? result.netScore : "N/A"}
                    </TableCell>
                    <TableCell className="text-center">
                      {result?.handicap !== null && result?.handicap !== undefined ? result.handicap : "N/A"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {result?.points || 0}
                    </TableCell>
                  </TableRow>
                ))}
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
                  <TableHead>Position</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center">Gross</TableHead>
                  <TableHead className="text-center">Net</TableHead>
                  <TableHead className="text-center">Handicap</TableHead>
                  <TableHead className="text-right">Gross Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tournamentResults.map((result) => (
                  <TableRow key={result?.id || 'unknown'}>
                    <TableCell className="font-semibold">
                      {result?.grossPosition || ''}
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
                      {result?.grossScore !== null && result?.grossScore !== undefined ? result.grossScore : "N/A"}
                    </TableCell>
                    <TableCell className="text-center">
                      {result?.netScore !== null && result?.netScore !== undefined ? result.netScore : "N/A"}
                    </TableCell>
                    <TableCell className="text-center">
                      {result?.handicap !== null && result?.handicap !== undefined ? result.handicap : "N/A"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {result?.grossPoints || 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}