import { useState } from "react";
import { useParams } from "wouter";
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
import { Loader2 } from "lucide-react";
import { Tournament } from "@shared/schema";
import { formatDate } from "@/lib/utils";
// Simple helper function for formatting positions
function formatPosition(position: number, isTied: boolean): string {
  return isTied ? `T${position}` : `${position}`;
}

// Function to get tournament type label
function getTournamentTypeLabel(type: string): string {
  switch (type) {
    case 'major':
      return 'Major';
    case 'tour':
      return 'Tour';
    case 'league':
      return 'League';
    case 'supr':
      return 'SUPR Club';
    default:
      return type;
  }
}

export default function TournamentResults() {
  const { id } = useParams();
  const tournamentId = id ? parseInt(id) : 0;
  const [activeTab, setActiveTab] = useState<"net" | "gross">("net");
  
  // Fetch tournament details
  const { data: tournament, isLoading: tournamentLoading } = useQuery<Tournament>({
    queryKey: [`/api/tournaments/${tournamentId}`],
    enabled: !isNaN(tournamentId) && tournamentId > 0,
  });
  
  // Fetch tournament results
  const { data: results, isLoading: resultsLoading } = useQuery<any[]>({
    queryKey: [`/api/tournaments/${tournamentId}/results`],
    enabled: !isNaN(tournamentId) && tournamentId > 0,
  });
  
  const isLoading = tournamentLoading || resultsLoading;
  
  // For NET leaderboard: use stored positions from database and detect ties by comparing net scores
  const netLeaderboardWithPositions = results
    ? [...results]
        .filter(result => result.netScore !== null)
        .sort((a, b) => a.position - b.position) // Sort by stored position from database
        .map((result, index, sortedResults) => {
          // Detect if this position is tied by checking adjacent players with same net score
          const isTied = (
            (index > 0 && sortedResults[index - 1].netScore === result.netScore) ||
            (index < sortedResults.length - 1 && sortedResults[index + 1].netScore === result.netScore)
          );
          
          return {
            ...result,
            displayPosition: formatPosition(result.position, isTied),
            actualPosition: result.position,
            isTied
          };
        })
    : [];
    
  // For GROSS leaderboard: sort by gross score and detect ties
  const grossLeaderboardWithPositions = results
    ? [...results]
        .filter(result => result.grossScore !== null)
        .sort((a, b) => a.grossScore! - b.grossScore!) // Sort by gross score (lower is better)
        .map((result, index, sortedResults) => {
          // Calculate position based on gross score order (not stored database position)
          let grossPosition = index + 1;
          
          // Check if previous players have same gross score (tied for previous position)
          if (index > 0 && sortedResults[index - 1].grossScore === result.grossScore) {
            // Find the first player with this gross score
            let firstTieIndex = index - 1;
            while (firstTieIndex > 0 && sortedResults[firstTieIndex - 1].grossScore === result.grossScore) {
              firstTieIndex--;
            }
            grossPosition = firstTieIndex + 1;
          }
          
          // Detect if this position is tied
          const isTied = (
            (index > 0 && sortedResults[index - 1].grossScore === result.grossScore) ||
            (index < sortedResults.length - 1 && sortedResults[index + 1].grossScore === result.grossScore)
          );
          
          return {
            ...result,
            displayPosition: formatPosition(grossPosition, isTied),
            actualPosition: grossPosition,
            isTied
          };
        })
    : [];
  
  // Add ordinal suffix to position
  const getOrdinalSuffix = (num: number): string => {
    const j = num % 10;
    const k = num % 100;
    
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

  // Get the original handicap string (with + sign if present)
  const getHandicapIndex = (result: any): string => {
    // This function returns the original handicap value with the "+" sign if it was present
    if (!result.originalHandicap) {
      // If no originalHandicap field exists, we make an inference based on existing data
      if (result.handicap !== null) {
        const grossMinusNet = result.grossScore - result.netScore;
        // If handicap is positive but net is higher than gross, it likely had a "+" sign
        if (grossMinusNet < 0 && result.handicap > 0) {
          return `+${result.handicap}`;
        }
      }
      return result.handicap?.toString() || "N/A";
    }
    return result.originalHandicap;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!tournament || !results) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Tournament Not Found</h2>
        <p className="text-neutral-600 mb-6">The tournament you're looking for does not exist or has been removed.</p>
        <Button onClick={() => window.history.back()}>Go Back</Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-heading font-bold">{tournament.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-neutral-600">{formatDate(tournament.date)}</p>
            <Badge variant={tournament.type as any}>{getTournamentTypeLabel(tournament.type)}</Badge>
          </div>
        </div>
        <Button variant="outline" onClick={() => window.history.back()}>Back</Button>
      </div>
      
      {/* Tab navigation at the top */}
      <div className="mb-6">
        <div className="w-full max-w-md mx-auto">
          <div className="flex rounded-lg overflow-hidden border">
            <button
              onClick={() => setActiveTab("net")}
              className={`flex-1 py-3 px-4 text-center font-medium ${
                activeTab === "net" 
                  ? "bg-primary text-white" 
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Net Leaderboard
            </button>
            <button
              onClick={() => setActiveTab("gross")}
              className={`flex-1 py-3 px-4 text-center font-medium ${
                activeTab === "gross" 
                  ? "bg-primary text-white" 
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Gross Leaderboard
            </button>
          </div>
        </div>
      </div>
      
      {/* Fixed tab navigation at bottom of screen */}
      <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center">
        <div className="bg-white rounded-full shadow-lg border px-4 py-3">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab("net")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                activeTab === "net" 
                  ? "bg-primary text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Net
            </button>
            <button
              onClick={() => setActiveTab("gross")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                activeTab === "gross" 
                  ? "bg-primary text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Gross
            </button>
          </div>
        </div>
      </div>
      
      {/* Content area based on selected tab */}
      <div className="content-area">
        {activeTab === "net" ? (
          <Card>
            <CardHeader>
              <CardTitle>Net Scores</CardTitle>
              <CardDescription>
                Players ranked by net score (with handicap adjustments)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Position</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-center">Gross Score</TableHead>
                      <TableHead className="text-center">Net Score</TableHead>
                      {isStrokeTournament && (
                        <>
                          <TableHead className="text-center">Playing Handicap</TableHead>
                          <TableHead className="text-center">HDCP Index</TableHead>
                        </>
                      )}
                      <TableHead className="text-right">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {netLeaderboardWithPositions.map((result, index) => {
                      // Use actual points from database (includes tie averaging)
                      const netPoints = result.points || 0;
                        
                      return (
                        <TableRow key={result.id}>
                          <TableCell className="font-semibold">
                            <span className={result.isTied ? "text-orange-600" : ""}>
                              {result.displayPosition}
                              {!result.isTied && <sup>{getOrdinalSuffix(result.actualPosition)}</sup>}
                            </span>
                          </TableCell>
                          <TableCell>
                            <a 
                              href={`/player/${result.player.id}`}
                              className="text-primary hover:text-primary-dark hover:underline cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                window.location.href = `/player/${result.player.id}`;
                              }}
                            >
                              {result.player.name}
                            </a>
                          </TableCell>
                          <TableCell className="text-center">
                            {result.grossScore ?? "N/A"}
                          </TableCell>
                          <TableCell className="text-center">
                            {result.netScore ?? "N/A"}
                          </TableCell>
                          {isStrokeTournament && (
                            <>
                              <TableCell className="text-center">
                                {result.handicap !== null ? result.handicap : "N/A"}
                              </TableCell>
                              <TableCell className="text-center">
                                {getHandicapIndex(result)}
                              </TableCell>
                            </>
                          )}
                          <TableCell className="text-right font-semibold">
                            {/* Use calculated net points based on current net leaderboard position */}
                            {netPoints}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Gross Scores</CardTitle>
              <CardDescription>
                Players ranked by gross score without handicap adjustments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Position</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-center">Gross Score</TableHead>
                      <TableHead className="text-center">Net Score</TableHead>
                      {isStrokeTournament && (
                        <>
                          <TableHead className="text-center">Playing Handicap</TableHead>
                          <TableHead className="text-center">HDCP Index</TableHead>
                        </>
                      )}
                      <TableHead className="text-right">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grossLeaderboardWithPositions.map((result, index) => {
                      // Use gross points for gross leaderboard
                      const grossPoints = result.grossPoints || 0;
                        
                      return (
                        <TableRow key={result.id}>
                          <TableCell className="font-semibold">
                            <span className={result.isTied ? "text-orange-600" : ""}>
                              {result.displayPosition}
                              {!result.isTied && <sup>{getOrdinalSuffix(result.actualPosition)}</sup>}
                            </span>
                          </TableCell>
                          <TableCell>
                            <a 
                              href={`/player/${result.player.id}`}
                              className="text-primary hover:text-primary-dark hover:underline cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                window.location.href = `/player/${result.player.id}`;
                              }}
                            >
                              {result.player.name}
                            </a>
                          </TableCell>
                          <TableCell className="text-center">
                            {result.grossScore ?? "N/A"}
                          </TableCell>
                          <TableCell className="text-center">
                            {result.netScore ?? "N/A"}
                          </TableCell>
                          {isStrokeTournament && (
                            <>
                              <TableCell className="text-center">
                                {result.handicap !== null ? result.handicap : "N/A"}
                              </TableCell>
                              <TableCell className="text-center">
                                {getHandicapIndex(result)}
                              </TableCell>
                            </>
                          )}
                          <TableCell className="text-right font-semibold">
                            {grossPoints}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}