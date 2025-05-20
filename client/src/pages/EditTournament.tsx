import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter,
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Save, Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TOURNAMENT_TYPES } from "@/lib/constants";
import type { Tournament, PlayerResult, TournamentType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

interface TournamentWithResults extends Tournament {
  results: PlayerResult[];
}

export default function EditTournament() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<TournamentType | "">("");
  const [results, setResults] = useState<Array<any>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Use debounce to avoid excessive filtering on every keystroke
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // Filter results based on search query
  const filteredResults = results.filter(result => {
    if (!debouncedSearchQuery) return true;
    
    // Search by player name (case insensitive)
    return result.playerName?.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
  });
  
  // Fetch tournament data with results - directly use the tournament endpoint which includes results
  const { data: tournament, isLoading } = useQuery<TournamentWithResults>({
    queryKey: [`/api/tournaments/${id}`],
    queryFn: async () => {
      // Fetch the tournament - it already includes the results array
      const tournamentResponse = await fetch(`/api/tournaments/${id}`);
      if (!tournamentResponse.ok) throw new Error('Failed to fetch tournament');
      const tournamentData = await tournamentResponse.json();
      
      console.log(`Loaded tournament with ${tournamentData.results?.length || 0} results`);
      
      return tournamentData;
    },
    enabled: !!id,
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
    if (!id) return;
    
    setIsSaving(true);
    
    try {
      // Prepare the data for API
      const payload = {
        id: parseInt(id),
        name,
        date,
        type,
        results: results.map(result => ({
          id: result.id,
          playerId: result.playerId,
          position: parseInt(result.position) || 0,
          grossScore: result.grossScore !== null ? parseInt(result.grossScore) : null,
          netScore: result.netScore !== null ? parseInt(result.netScore) : null,
          handicap: result.handicap !== null ? parseFloat(result.handicap) : null,
          points: result.points !== null ? parseFloat(result.points) : null
        }))
      };
      
      // Make the API request
      await apiRequest("PUT", `/api/tournaments/${id}/edit`, payload);
      
      // Show success message
      toast({
        title: "Tournament updated",
        description: "Tournament and scores have been updated successfully",
        variant: "default",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/net"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/gross"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      queryClient.invalidateQueries({ queryKey: [`/api/tournaments/${id}`] });
      
      // Navigate back to tournaments page
      navigate("/tournaments");
    } catch (error) {
      console.error("Error updating tournament:", error);
      toast({
        title: "Error",
        description: "Failed to update tournament. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const goBack = () => {
    navigate("/tournaments");
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={goBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-heading font-bold">Edit Tournament</h1>
          <p className="text-neutral-600">Update tournament details and player scores</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Tournament Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  {TOURNAMENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Player Scores</CardTitle>
          <CardDescription>Edit player scores and positions for this tournament</CardDescription>
          <div className="relative mt-2">
            <Input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-8"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search className="h-4 w-4 text-neutral-400" />
            </div>
          </div>
          {results.length > 0 && (
            <p className="text-sm text-neutral-500 mt-2">
              {debouncedSearchQuery 
                ? `Showing ${filteredResults.length} of ${results.length} players` 
                : `${results.length} total players`}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[calc(100vh-400px)]">
            <Table>
              <TableHeader className="sticky top-0 bg-white">
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Gross Score</TableHead>
                  <TableHead>Net Score</TableHead>
                  <TableHead>Handicap</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell className="font-medium">{result.playerName}</TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={result.position || ""} 
                        onChange={(e) => handleResultChange(result.id, "position", e.target.value)}
                        className="w-20"
                        disabled={isSaving}
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={result.grossScore !== null ? result.grossScore : ""} 
                        onChange={(e) => handleResultChange(result.id, "grossScore", e.target.value === "" ? null : e.target.value)}
                        className="w-20"
                        disabled={isSaving}
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={result.netScore !== null ? result.netScore : ""} 
                        onChange={(e) => handleResultChange(result.id, "netScore", e.target.value === "" ? null : e.target.value)}
                        className="w-20"
                        disabled={isSaving}
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={result.handicap !== null ? result.handicap : ""} 
                        onChange={(e) => handleResultChange(result.id, "handicap", e.target.value === "" ? null : e.target.value)}
                        className="w-20"
                        disabled={isSaving}
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        value={result.points !== null ? result.points : ""} 
                        onChange={(e) => handleResultChange(result.id, "points", e.target.value === "" ? null : e.target.value)}
                        className="w-20"
                        disabled={isSaving}
                      />
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeletePlayer(result.id)}
                        disabled={isSaving}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={goBack} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}