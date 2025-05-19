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
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { Tournament } from "@shared/schema";
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
  
  // Sort results by position for net and gross scores
  const sortedNetResults = results
    ? [...results].sort((a, b) => a.position - b.position)
    : [];
    
  // For gross results, sort by gross score and calculate points based on position in gross scoring
  const sortedGrossResults = results
    ? [...results]
        .filter(result => result.grossScore !== null)
        .sort((a, b) => {
          // Sort by gross score, with null values at the end
          if (a.grossScore === null && b.grossScore === null) {
            return a.player.name.localeCompare(b.player.name);
          }
          if (a.grossScore === null) return 1;
          if (b.grossScore === null) return -1;
          return a.grossScore - b.grossScore;
        })
        .map((result, index) => {
          // Clone the result object to avoid mutating the original
          const grossResult = { ...result };
          
          // Calculate gross points based on position in this sorted list
          // Points values follow tour points system
          const grossPosition = index + 1;
          
          // Calculate points based on finishing position in gross scoring
          switch (grossPosition) {
            case 1: grossResult.grossPoints = 500; break;
            case 2: grossResult.grossPoints = 300; break;
            case 3: grossResult.grossPoints = 190; break;
            case 4: grossResult.grossPoints = 135; break;
            case 5: grossResult.grossPoints = 110; break;
            case 6: grossResult.grossPoints = 100; break;
            case 7: grossResult.grossPoints = 90; break;
            case 8: grossResult.grossPoints = 85; break;
            case 9: grossResult.grossPoints = 80; break;
            case 10: grossResult.grossPoints = 75; break;
            default:
              // For 11th place and beyond
              if (grossPosition <= 15) {
                grossResult.grossPoints = 70 - ((grossPosition - 11) * 2);
              } else if (grossPosition <= 20) {
                grossResult.grossPoints = 60 - ((grossPosition - 16) * 2);
              } else if (grossPosition <= 30) {
                grossResult.grossPoints = 50 - ((grossPosition - 21) * 2.5);
              } else if (grossPosition <= 40) {
                grossResult.grossPoints = 25 - ((grossPosition - 31) * 1);
              } else {
                grossResult.grossPoints = 15;
              }
          }
          
          return grossResult;
        })
    : [];
    
  // Add null gross score players at the end, sorted alphabetically
  const nullGrossScorePlayers = results
    ? [...results]
        .filter(result => result.grossScore === null)
        .sort((a, b) => a.player.name.localeCompare(b.player.name))
        .map(result => ({ ...result, grossPoints: 0 }))
    : [];
    
  // Combine sorted players with nulls at the end
  const combinedGrossResults = [...sortedGrossResults, ...nullGrossScorePlayers];
  
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
        <Button onClick={() => window.history.back()}>Go Back</Button>
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
        <Button variant="outline" onClick={() => window.history.back()}>Back</Button>
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
                        <TableHead className="text-right">Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {combinedGrossResults.map((result, index) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-semibold">
                            {index + 1}<sup>{getOrdinalSuffix(index + 1)}</sup>
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
                          <TableCell className="text-center">
                            {result.handicap !== null ? result.handicap : "N/A"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {result.grossPoints || 0}
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