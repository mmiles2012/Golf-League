import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { TOURNAMENT_TYPES } from "@/lib/constants";
import { useQueryClient } from "@tanstack/react-query";
import PlayerSearchInput from "./PlayerSearchInput";

interface PlayerEntry {
  id: number;
  playerId?: number;
  playerName: string;
  position: number;
  grossScore?: number;
  netScore?: number;
  handicap?: number;
}

export default function ManualEntryForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [tournamentName, setTournamentName] = useState("");
  const [tournamentDate, setTournamentDate] = useState("");
  const [tournamentType, setTournamentType] = useState("");
  const [playerEntries, setPlayerEntries] = useState<PlayerEntry[]>([
    { id: 1, playerName: "", position: 1 }
  ]);
  const [newPlayerDialogOpen, setNewPlayerDialogOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerEmail, setNewPlayerEmail] = useState("");
  const [newPlayerHandicap, setNewPlayerHandicap] = useState<number | undefined>();
  const [currentPlayerEntryId, setCurrentPlayerEntryId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const addPlayerEntry = () => {
    const newId = Math.max(0, ...playerEntries.map(entry => entry.id)) + 1;
    setPlayerEntries([
      ...playerEntries,
      { id: newId, playerName: "", position: playerEntries.length + 1 }
    ]);
  };
  
  const removePlayerEntry = (id: number) => {
    if (playerEntries.length === 1) {
      toast({
        title: "Cannot remove entry",
        description: "You need at least one player entry",
        variant: "destructive"
      });
      return;
    }
    
    setPlayerEntries(playerEntries.filter(entry => entry.id !== id));
  };
  
  const updatePlayerEntry = (id: number, field: string, value: any) => {
    setPlayerEntries(
      playerEntries.map(entry => 
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
  };
  
  const handlePlayerSelect = (id: number, playerId: number, playerName: string) => {
    updatePlayerEntry(id, 'playerId', playerId);
    updatePlayerEntry(id, 'playerName', playerName);
  };
  
  const handlePlayerNotFound = (id: number, name: string) => {
    setNewPlayerName(name);
    setCurrentPlayerEntryId(id);
    setNewPlayerDialogOpen(true);
  };
  
  const createNewPlayer = async () => {
    if (!newPlayerName || !currentPlayerEntryId) {
      setNewPlayerDialogOpen(false);
      return;
    }
    
    try {
      const response = await apiRequest("POST", "/api/players", {
        name: newPlayerName,
        email: newPlayerEmail || undefined,
        defaultHandicap: newPlayerHandicap
      });
      
      if (!response.ok) {
        throw new Error("Failed to create new player");
      }
      
      const newPlayer = await response.json();
      
      // Update the player entry
      handlePlayerSelect(currentPlayerEntryId, newPlayer.id, newPlayer.name);
      
      toast({
        title: "Player created",
        description: `${newPlayer.name} has been added to the system`,
        variant: "default"
      });
      
      // Invalidate player queries
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      
    } catch (error) {
      console.error("Error creating player:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create player",
        variant: "destructive"
      });
    } finally {
      setNewPlayerDialogOpen(false);
      setNewPlayerName("");
      setNewPlayerEmail("");
      setNewPlayerHandicap(undefined);
      setCurrentPlayerEntryId(null);
    }
  };
  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validation
    if (!tournamentName || !tournamentDate || !tournamentType) {
      toast({
        title: "Missing information",
        description: "Please fill in all tournament fields",
        variant: "destructive"
      });
      return;
    }
    
    // Check if all player entries have names and positions
    const invalidEntries = playerEntries.filter(entry => 
      !entry.playerName || !entry.position
    );
    
    if (invalidEntries.length > 0) {
      toast({
        title: "Invalid player entries",
        description: "All players must have a name and position",
        variant: "destructive"
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      const tournamentData = {
        name: tournamentName,
        date: tournamentDate,
        type: tournamentType,
        results: playerEntries.map(entry => ({
          playerId: entry.playerId,
          playerName: entry.playerName,
          position: entry.position,
          grossScore: entry.grossScore,
          netScore: entry.netScore,
          handicap: entry.handicap
        }))
      };
      
      const response = await apiRequest("POST", "/api/tournaments/manual-entry", tournamentData);
      
      if (!response.ok) {
        throw new Error("Failed to save tournament");
      }
      
      const data = await response.json();
      
      toast({
        title: "Tournament saved",
        description: `${data.tournament.name} has been added successfully`,
        variant: "default"
      });
      
      // Reset form
      setTournamentName("");
      setTournamentDate("");
      setTournamentType("");
      setPlayerEntries([{ id: 1, playerName: "", position: 1 }]);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/net"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/gross"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      
    } catch (error) {
      console.error("Error saving tournament:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save tournament",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Tournament Information</CardTitle>
          <CardDescription>Enter the details for a League or SUPR Club event</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="manual-tournament-name">Tournament Name</Label>
                  <Input 
                    id="manual-tournament-name" 
                    type="text" 
                    placeholder="Enter tournament name" 
                    value={tournamentName}
                    onChange={(e) => setTournamentName(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="manual-tournament-date">Tournament Date</Label>
                  <Input 
                    id="manual-tournament-date" 
                    type="date" 
                    value={tournamentDate}
                    onChange={(e) => setTournamentDate(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>
              
              <div className="mt-4 space-y-1">
                <Label htmlFor="manual-tournament-type">Tournament Type</Label>
                <Select 
                  value={tournamentType} 
                  onValueChange={setTournamentType}
                  disabled={isSaving}
                >
                  <SelectTrigger id="manual-tournament-type">
                    <SelectValue placeholder="Select tournament type" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Only show League and SUPR options for manual entry */}
                    {TOURNAMENT_TYPES.filter(type => 
                      type.value === 'league' || type.value === 'supr'
                    ).map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="py-4 border-t border-neutral-200">
              <h2 className="text-xl font-heading font-bold mb-4">Player Results</h2>
              
              <div id="player-entries" className="space-y-4">
                {playerEntries.map(entry => (
                  <div key={entry.id} className="player-entry p-4 bg-neutral-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <Label className="block text-sm font-medium mb-1">Player Name</Label>
                        <PlayerSearchInput
                          value={entry.playerName}
                          onChange={(value) => updatePlayerEntry(entry.id, 'playerName', value)}
                          onSelect={(playerId, playerName) => handlePlayerSelect(entry.id, playerId, playerName)}
                          onNotFound={(name) => handlePlayerNotFound(entry.id, name)}
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <Label className="block text-sm font-medium mb-1">Position</Label>
                        <Input 
                          type="number" 
                          min="1"
                          value={entry.position}
                          onChange={(e) => updatePlayerEntry(entry.id, 'position', parseInt(e.target.value))}
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <Label className="block text-sm font-medium mb-1">Gross Score</Label>
                        <Input 
                          type="number" 
                          value={entry.grossScore || ''}
                          onChange={(e) => updatePlayerEntry(entry.id, 'grossScore', e.target.value ? parseInt(e.target.value) : undefined)}
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <Label className="block text-sm font-medium mb-1">Handicap</Label>
                        <Input 
                          type="number" 
                          step="0.1"
                          value={entry.handicap || ''}
                          onChange={(e) => updatePlayerEntry(entry.id, 'handicap', e.target.value ? parseFloat(e.target.value) : undefined)}
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <Label className="block text-sm font-medium mb-1">Net Score</Label>
                        <Input 
                          type="number"
                          value={entry.netScore || ''}
                          onChange={(e) => updatePlayerEntry(entry.id, 'netScore', e.target.value ? parseInt(e.target.value) : undefined)}
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => removePlayerEntry(entry.id)}
                        disabled={isSaving}
                        className="inline-flex items-center text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-500"
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={addPlayerEntry}
                  disabled={isSaving}
                  className="inline-flex items-center"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Another Player
                </Button>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Button 
                  type="submit" 
                  disabled={isSaving}
                  className="inline-flex items-center"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Tournament Results
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* New Player Dialog */}
      <Dialog open={newPlayerDialogOpen} onOpenChange={setNewPlayerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Player</DialogTitle>
            <DialogDescription>
              The player you entered was not found in the system. Do you want to create a new player record?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-4">
            <div className="space-y-1">
              <Label htmlFor="new-player-name">Player Name</Label>
              <Input 
                id="new-player-name" 
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-player-email">Email (Optional)</Label>
              <Input 
                id="new-player-email" 
                type="email"
                value={newPlayerEmail}
                onChange={(e) => setNewPlayerEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-player-handicap">Default Handicap</Label>
              <Input 
                id="new-player-handicap" 
                type="number"
                step="0.1"
                value={newPlayerHandicap || ''}
                onChange={(e) => setNewPlayerHandicap(e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </div>
          </div>
          
          <DialogFooter className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setNewPlayerDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={createNewPlayer}>
              Create Player
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
