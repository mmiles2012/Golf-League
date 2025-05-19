import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { TOURNAMENT_TYPES } from "@/lib/constants";
import { useQuery } from "@tanstack/react-query";
import type { Tournament, PlayerResult, TournamentType } from "@shared/schema";

interface TournamentWithResults extends Tournament {
  results: PlayerResult[];
}

interface EditTournamentDialogProps {
  tournamentId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditTournamentDialog({ 
  tournamentId, 
  isOpen, 
  onClose 
}: EditTournamentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<TournamentType | "">("");
  const [results, setResults] = useState<Array<any>>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch tournament data with results
  const { data: tournament, isLoading } = useQuery<TournamentWithResults>({
    queryKey: [`/api/tournaments/${tournamentId}`],
    queryFn: async () => {
      // First fetch the tournament
      const tournamentResponse = await fetch(`/api/tournaments/${tournamentId}`);
      if (!tournamentResponse.ok) throw new Error('Failed to fetch tournament');
      const tournamentData = await tournamentResponse.json();
      
      // Then fetch the tournament results
      const resultsResponse = await fetch(`/api/tournaments/${tournamentId}/results`);
      if (!resultsResponse.ok) throw new Error('Failed to fetch tournament results');
      const resultsData = await resultsResponse.json();
      
      // Combine them
      return {
        ...tournamentData,
        results: resultsData
      };
    },
    enabled: isOpen && tournamentId !== null,
  });
  
  // Update state when tournament data is loaded
  useEffect(() => {
    if (tournament) {
      setName(tournament.name);
      setDate(tournament.date ? new Date(tournament.date).toISOString().split('T')[0] : "");
      setType(tournament.type);
      
      // Get players for results
      if (tournament.results) {
        queryClient.fetchQuery({ 
          queryKey: ['/api/players'],
          queryFn: async () => {
            const response = await fetch('/api/players');
            if (!response.ok) throw new Error('Failed to fetch players');
            return response.json();
          }
        })
        .then(players => {
          // Map player IDs to names
          const playerMap = new Map();
          players.forEach((player: any) => {
            playerMap.set(player.id, player.name);
          });
          
          // Create results with player names
          const resultsWithNames = tournament.results.map(result => ({
            ...result,
            playerName: playerMap.get(result.playerId) || 'Unknown Player'
          }));
          
          setResults(resultsWithNames);
        })
        .catch(error => {
          console.error("Error fetching players:", error);
        });
      }
    }
  }, [tournament, queryClient]);
  
  const handleResultChange = (id: number, field: string, value: any) => {
    setResults(prev => 
      prev.map(result => 
        result.id === id ? { ...result, [field]: value } : result
      )
    );
  };
  
  const handleSubmit = async () => {
    if (!tournamentId) return;
    
    setIsSaving(true);
    
    try {
      // Prepare the data for API
      const tournamentData = {
        name,
        date,
        type,
        results: results.map(result => ({
          id: result.id,
          playerId: result.playerId,
          position: parseInt(result.position),
          grossScore: result.grossScore ? parseInt(result.grossScore) : undefined,
          netScore: result.netScore ? parseInt(result.netScore) : undefined,
          handicap: result.handicap ? parseFloat(result.handicap) : undefined,
          points: result.points
        }))
      };
      
      const response = await apiRequest("PUT", `/api/tournaments/${tournamentId}/edit`, tournamentData);
      
      if (!response.ok) {
        throw new Error("Failed to update tournament");
      }
      
      toast({
        title: "Tournament updated",
        description: "The tournament has been updated successfully",
        variant: "default"
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/net"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/gross"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${tournamentId}`] });
      
      onClose();
    } catch (error) {
      console.error("Error updating tournament:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update tournament",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit Tournament</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="tournament-name">Tournament Name</Label>
                <Input 
                  id="tournament-name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tournament-date">Tournament Date</Label>
                <Input 
                  id="tournament-date" 
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tournament-type">Tournament Type</Label>
                <Select 
                  value={type} 
                  onValueChange={(value) => setType(value as TournamentType)}
                  disabled={isSaving}
                >
                  <SelectTrigger id="tournament-type">
                    <SelectValue placeholder="Select tournament type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOURNAMENT_TYPES.map((tournamentType) => (
                      <SelectItem key={tournamentType.value} value={tournamentType.value}>
                        {tournamentType.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="font-heading font-semibold text-md mb-3">Player Results</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-neutral-100">
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-center">Position</TableHead>
                      <TableHead className="text-center">Gross Score</TableHead>
                      <TableHead className="text-center">Handicap</TableHead>
                      <TableHead className="text-center">Net Score</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Net Points</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Gross Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-neutral-200">
                    {results.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>{result.playerName}</TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="1"
                            value={result.position}
                            onChange={(e) => handleResultChange(result.id, 'position', e.target.value)}
                            className="w-16 text-center"
                            disabled={isSaving}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            value={result.grossScore || ''}
                            onChange={(e) => handleResultChange(result.id, 'grossScore', e.target.value)}
                            className="w-16 text-center"
                            disabled={isSaving}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            step="0.1"
                            value={result.handicap || ''}
                            onChange={(e) => handleResultChange(result.id, 'handicap', e.target.value)}
                            className="w-16 text-center"
                            disabled={isSaving}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            value={result.netScore || ''}
                            onChange={(e) => handleResultChange(result.id, 'netScore', e.target.value)}
                            className="w-16 text-center"
                            disabled={isSaving}
                          />
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {result.points}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {(() => {
                            // Calculate gross points based on position (from Founders Series Tour Points List)
                            const grossPointsTable = [
                              500, 300, 190, 135, 110, 100, 90, 85, 80, 75,    // 1-10
                              70, 65, 60, 55, 53, 51, 49, 47, 45, 43,          // 11-20
                              41, 39, 37, 35.5, 34, 32.5, 31, 29.5, 28, 26.5,  // 21-30
                              25, 23.5, 22, 21, 20, 19, 18, 17, 16, 15,        // 31-40
                              14, 13, 12, 11, 10.5, 10, 9.5, 9, 8.5, 8         // 41-50
                            ];
                            
                            // Sort results by gross score to determine gross position
                            const sortedByGrossScore = [...results]
                              .sort((a, b) => (a.grossScore || 999) - (b.grossScore || 999));
                            
                            // Find position of current player in the sorted array
                            const grossPosition = sortedByGrossScore.findIndex(
                              item => item.id === result.id
                            );
                            
                            // Return the appropriate points based on position
                            return grossPosition >= 0 && grossPosition < grossPointsTable.length 
                              ? grossPointsTable[grossPosition] 
                              : 0;
                          })()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
        
        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading || isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
