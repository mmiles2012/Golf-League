import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Save, Upload, FileSpreadsheet } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { TOURNAMENT_TYPES } from "@/lib/constants";
import { useQueryClient } from "@tanstack/react-query";
import PlayerSearchInput from "./PlayerSearchInput";

interface PlayerEntry {
  id: number;
  playerId?: number;
  playerName: string;
  position: number;
  points: number;
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
  const [scoringType, setScoringType] = useState("");
  const [inputMode, setInputMode] = useState<"individual" | "spreadsheet">("individual");
  const [spreadsheetData, setSpreadsheetData] = useState("");
  const [playerEntries, setPlayerEntries] = useState<PlayerEntry[]>([
    { id: 1, playerName: "", position: 1, points: 0 }
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
      { id: newId, playerName: "", position: playerEntries.length + 1, points: 0 }
    ]);
  };

  const parseSpreadsheetData = () => {
    if (!spreadsheetData.trim()) {
      toast({
        title: "No data to parse",
        description: "Please enter some spreadsheet data",
        variant: "destructive"
      });
      return;
    }

    try {
      const lines = spreadsheetData.trim().split('\n');
      const entries: PlayerEntry[] = [];
      
      lines.forEach((line, index) => {
        const parts = line.split('\t').map(p => p.trim()); // Tab-separated
        if (parts.length < 3) {
          // Try comma-separated if tab-separated didn't work
          const commaParts = line.split(',').map(p => p.trim());
          if (commaParts.length >= 3) {
            parts.splice(0, parts.length, ...commaParts);
          }
        }
        
        if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
          const playerName = parts[0];
          const position = parseInt(parts[1]);
          const points = parseFloat(parts[2]);
          
          if (!isNaN(position) && !isNaN(points)) {
            entries.push({
              id: index + 1,
              playerName,
              position,
              points,
              grossScore: parts[3] ? parseFloat(parts[3]) : undefined,
              netScore: parts[4] ? parseFloat(parts[4]) : undefined,
              handicap: parts[5] ? parseFloat(parts[5]) : undefined,
            });
          }
        }
      });

      if (entries.length === 0) {
        toast({
          title: "No valid entries found",
          description: "Please check your data format. Expected: Player Name, Position, Points (tab or comma separated)",
          variant: "destructive"
        });
        return;
      }

      setPlayerEntries(entries);
      toast({
        title: "Data imported",
        description: `Successfully imported ${entries.length} player entries`,
      });
    } catch (error) {
      toast({
        title: "Error parsing data",
        description: "Please check your data format and try again",
        variant: "destructive"
      });
    }
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
    
    // Check if all player entries have names, positions, and points
    const invalidEntries = playerEntries.filter(entry => 
      !entry.playerName || !entry.position || entry.points === undefined || entry.points < 0
    );
    
    if (invalidEntries.length > 0) {
      toast({
        title: "Invalid player entries",
        description: "All players must have a name, position, and points value",
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
        scoringType: scoringType || undefined,
        results: playerEntries.map(entry => ({
          playerId: entry.playerId,
          playerName: entry.playerName,
          position: entry.position,
          points: entry.points,
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
      setScoringType("");
      setSpreadsheetData("");
      setPlayerEntries([{ id: 1, playerName: "", position: 1, points: 0 }]);
      
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
          <CardTitle className="flex items-center gap-2">
            Tournament Information
            <Badge variant="destructive" className="bg-red-100 text-red-800">OLD FORM v1.0</Badge>
          </CardTitle>
          <CardDescription>Enter details for any tournament type with flexible scoring</CardDescription>
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-1">
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
                      {/* Show all tournament types for manual entry */}
                      {TOURNAMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="manual-scoring-type">Scoring Type (Optional)</Label>
                  <Input 
                    id="manual-scoring-type" 
                    type="text" 
                    placeholder="e.g., Team Event, Stableford, etc." 
                    value={scoringType}
                    onChange={(e) => setScoringType(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>
            
            <div className="py-4 border-t border-neutral-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-heading font-bold">Player Results</h2>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={inputMode === "individual" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setInputMode("individual")}
                    disabled={isSaving}
                  >
                    Individual Entry
                  </Button>
                  <Button
                    type="button"
                    variant={inputMode === "spreadsheet" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setInputMode("spreadsheet")}
                    disabled={isSaving}
                  >
                    <FileSpreadsheet className="mr-1 h-4 w-4" />
                    Spreadsheet
                  </Button>
                </div>
              </div>

              {inputMode === "spreadsheet" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="spreadsheet-data">Paste Spreadsheet Data</Label>
                    <p className="text-sm text-neutral-600">
                      Paste data from Excel/Google Sheets. Expected format: Player Name, Position, Points (optional: Gross Score, Net Score, Handicap)
                    </p>
                    <Textarea
                      id="spreadsheet-data"
                      placeholder={`Example:
John Doe        1       100     72      68      4
Jane Smith      2       85      75      71      4
Bob Wilson      3       70      78      74      4`}
                      value={spreadsheetData}
                      onChange={(e) => setSpreadsheetData(e.target.value)}
                      disabled={isSaving}
                      rows={8}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={parseSpreadsheetData}
                      disabled={isSaving || !spreadsheetData.trim()}
                      className="inline-flex items-center"
                    >
                      <Upload className="mr-1 h-4 w-4" />
                      Parse Data
                    </Button>
                    {playerEntries.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setInputMode("individual")}
                        disabled={isSaving}
                      >
                        Switch to Individual Entry
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div id="player-entries" className="space-y-4">
                  {playerEntries.map(entry => (
                    <div key={entry.id} className="player-entry p-4 bg-neutral-50 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                        <div>
                          <Label className="block text-sm font-medium mb-1">Points *</Label>
                          <Input 
                            type="number" 
                            min="0"
                            step="0.1"
                            value={entry.points}
                            onChange={(e) => updatePlayerEntry(entry.id, 'points', parseFloat(e.target.value) || 0)}
                            disabled={isSaving}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <Label className="block text-sm font-medium mb-1">Gross Score (Optional)</Label>
                          <Input 
                            type="number" 
                            value={entry.grossScore || ''}
                            onChange={(e) => updatePlayerEntry(entry.id, 'grossScore', e.target.value ? parseInt(e.target.value) : undefined)}
                            disabled={isSaving}
                          />
                        </div>
                        <div>
                          <Label className="block text-sm font-medium mb-1">Net Score (Optional)</Label>
                          <Input 
                            type="number"
                            value={entry.netScore || ''}
                            onChange={(e) => updatePlayerEntry(entry.id, 'netScore', e.target.value ? parseInt(e.target.value) : undefined)}
                            disabled={isSaving}
                          />
                        </div>
                        <div>
                          <Label className="block text-sm font-medium mb-1">Handicap (Optional)</Label>
                          <Input 
                            type="number" 
                            step="0.1"
                            value={entry.handicap || ''}
                            onChange={(e) => updatePlayerEntry(entry.id, 'handicap', e.target.value ? parseFloat(e.target.value) : undefined)}
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
              )}

              {inputMode === "individual" && (
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
              )}

              {/* Show current entries summary */}
              {playerEntries.length > 0 && playerEntries[0].playerName && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Current Entries ({playerEntries.length} players)</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-left">Player</TableHead>
                          <TableHead className="text-center">Pos</TableHead>
                          <TableHead className="text-center">Points</TableHead>
                          <TableHead className="text-center">Gross</TableHead>
                          <TableHead className="text-center">Net</TableHead>
                          <TableHead className="text-center">HCP</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {playerEntries
                          .filter(entry => entry.playerName)
                          .sort((a, b) => a.position - b.position)
                          .map(entry => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-medium">{entry.playerName}</TableCell>
                            <TableCell className="text-center">{entry.position}</TableCell>
                            <TableCell className="text-center">{entry.points}</TableCell>
                            <TableCell className="text-center">{entry.grossScore || '-'}</TableCell>
                            <TableCell className="text-center">{entry.netScore || '-'}</TableCell>
                            <TableCell className="text-center">{entry.handicap || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              
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
