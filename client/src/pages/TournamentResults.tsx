import { useState } from "react";
import { useParams, Link } from "wouter";
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
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { Tournament, Player } from "@shared/schema";
import { formatDate } from "@/lib/utils";

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

// Interface for tournament results with player info
interface TournamentResultWithPlayer {
  id: number;
  playerId: number;
  tournamentId: number;
  position: number;
  grossScore: number | null;
  netScore: number | null;
  handicap: number | null;
  points: number;
  player: Player;
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
  const { data: results, isLoading: resultsLoading } = useQuery<TournamentResultWithPlayer[]>({
    queryKey: [`/api/tournaments/${tournamentId}/results`],
    enabled: !isNaN(tournamentId) && tournamentId > 0,
  });
  
  const isLoading = tournamentLoading || resultsLoading;
  
  // Sort results by position for net and gross scores
  const sortedNetResults = results
    ? [...results].sort((a, b) => a.position - b.position)
    : [];
    
  const sortedGrossResults = results
    ? [...results].sort((a, b) => {
        // Sort by gross score, with null values at the end
        if (a.grossScore === null && b.grossScore === null) {
          return a.player.name.localeCompare(b.player.name);
        }
        if (a.grossScore === null) return 1;
        if (b.grossScore === null) return -1;
        return a.grossScore - b.grossScore;
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
        <Link href="/tournaments">
          <Button>View All Tournaments</Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-heading font-bold">{tournament.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-neutral-600">{formatDate(tournament.date)}</p>
            <Badge variant={tournament.type as any}>{getTournamentTypeLabel(tournament.type)}</Badge>
          </div>
        </div>
        <Link href="/tournaments">
          <Button variant="outline">Back to Tournaments</Button>
        </Link>
      </div>
      
      <div className="flex justify-start">
        <Tabs 
          defaultValue="net" 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as "net" | "gross")}
          className="w-full"
        >
          <TabsList className="mb-4">
            <TabsTrigger value="net">Net Leaderboard</TabsTrigger>
            <TabsTrigger value="gross">Gross Leaderboard</TabsTrigger>
          </TabsList>
          
          <TabsContent value="net">
            <Card>
              <CardHeader>
                <CardTitle>Net Scores</CardTitle>
                <CardDescription>
                  Players ranked by net score and finishing position
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
                        <TableHead className="text-center">Handicap</TableHead>
                        <TableHead className="text-right">Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedNetResults.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-semibold">
                            {result.position}<sup>{getOrdinalSuffix(result.position)}</sup>
                          </TableCell>
                          <TableCell>
                            <Link href={`/player/${result.player.id}`}>
                              <span className="text-primary hover:text-primary-dark hover:underline cursor-pointer">
                                {result.player.name}
                              </span>
                            </Link>
                          </TableCell>
                          <TableCell className="text-center">
                            {result.grossScore ?? "N/A"}
                          </TableCell>
                          <TableCell className="text-center">
                            {result.netScore ?? "N/A"}
                          </TableCell>
                          <TableCell className="text-center">
                            {result.handicap !== null ? result.handicap : "N/A"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {result.points}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="gross">
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
                        <TableHead className="text-center">Handicap</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedGrossResults.map((result, index) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-semibold">
                            {index + 1}<sup>{getOrdinalSuffix(index + 1)}</sup>
                          </TableCell>
                          <TableCell>
                            <Link href={`/player/${result.player.id}`}>
                              <span className="text-primary hover:text-primary-dark hover:underline cursor-pointer">
                                {result.player.name}
                              </span>
                            </Link>
                          </TableCell>
                          <TableCell className="text-center">
                            {result.grossScore ?? "N/A"}
                          </TableCell>
                          <TableCell className="text-center">
                            {result.netScore ?? "N/A"}
                          </TableCell>
                          <TableCell className="text-center">
                            {result.handicap !== null ? result.handicap : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}