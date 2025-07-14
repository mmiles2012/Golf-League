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
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Trash2, Plus, Save, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Eye } from "lucide-react";
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

export default function ManualEntryFormNew() {
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
  const [showPreview, setShowPreview] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [newPlayerDialogOpen, setNewPlayerDialogOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerEmail, setNewPlayerEmail] = useState("");
  const [newPlayerHandicap, setNewPlayerHandicap] = useState<number | undefined>();
  const [currentPlayerEntryId, setCurrentPlayerEntryId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  
  const resetForm = () => {
    setTournamentName("");
    setTournamentDate("");
    setTournamentType("");
    setScoringType("");
    setSpreadsheetData("");
    setPlayerEntries([{ id: 1, playerName: "", position: 1, points: 0 }]);
    setShowPreview(false);
    setUploadProgress(0);
    setUploadStatus("");
  };

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

  const generatePreview = () => {
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

    setShowPreview(true);
  };

  const handleSubmit = async () => {
    setShowWarningDialog(true);
  };

  const confirmSubmit = async () => {
    setShowWarningDialog(false);
    setIsSaving(true);
    setUploadProgress(10);
    setUploadStatus("Creating tournament...");
    
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
      
      setUploadProgress(50);
      setUploadStatus("Saving tournament results...");
      
      const response = await apiRequest("POST", "/api/tournaments/manual-entry", tournamentData);
      
      if (!response.ok) {
        throw new Error("Failed to save tournament");
      }
      
      const data = await response.json();
      
      setUploadProgress(100);
      setUploadStatus("Tournament saved successfully!");
      
      toast({
        title: "Tournament saved",
        description: `${data.tournament.name} has been added successfully and will not be subject to automatic recalculations`,
        variant: "default"
      });
      
      // Reset form
      resetForm();
      
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
      setTimeout(() => {
        setUploadProgress(0);
        setUploadStatus("");
      }, 3000);
    }
  };

  const getTournamentTypeLabel = (type: string) => {
    const typeConfig = TOURNAMENT_TYPES.find(t => t.value === type);
    return typeConfig ? typeConfig.label : type;
  };

  const totalPoints = playerEntries.reduce((sum, entry) => sum + (entry.points || 0), 0);
  
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Manual Tournament Entry
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">Enhanced v2.0</Badge>
                <Badge variant="outline" className="text-xs">ID: NEW-FORM-{Date.now().toString().slice(-6)}</Badge>
              </CardTitle>
              <CardDescription>
                Enter tournament results manually with custom scoring and direct points assignment.
                These results will not be subject to automatic recalculations.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Tournament Information */}
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    {TOURNAMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-neutral-500 mt-1">Points will be preserved as entered</p>
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

            {/* Input Mode Toggle */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Player Results</h3>
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
                    Spreadsheet Paste
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
            </div>

            {/* Upload Progress */}
            {isSaving && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-sm text-gray-600">{uploadStatus}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-4 border-t">
              <Button 
                onClick={generatePreview}
                disabled={isSaving || !tournamentName || !tournamentDate || !tournamentType || playerEntries.filter(e => e.playerName).length === 0}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                Generate Preview
              </Button>
              <Button 
                variant="outline" 
                onClick={resetForm}
                disabled={isSaving}
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tournament Preview */}
      {showPreview && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Tournament Preview</span>
            </CardTitle>
            <CardDescription>
              Review the tournament details before saving. Manual entry tournaments are not subject to recalculation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tournament Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-500">Tournament</p>
                <p className="text-lg font-semibold">{tournamentName}</p>
                <p className="text-sm text-gray-600">{getTournamentTypeLabel(tournamentType)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Date</p>
                <p className="text-lg font-semibold">{new Date(tournamentDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Players</p>
                <p className="text-lg font-semibold">{playerEntries.filter(e => e.playerName).length}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Points</p>
                <p className="text-lg font-semibold">{totalPoints.toFixed(1)}</p>
              </div>
            </div>

            {/* Results Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Position</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Gross Score</TableHead>
                    <TableHead>Net Score</TableHead>
                    <TableHead>Handicap</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playerEntries
                    .filter(entry => entry.playerName)
                    .sort((a, b) => a.position - b.position)
                    .map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge variant="outline">{entry.position}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{entry.playerName}</TableCell>
                      <TableCell className="font-semibold">{entry.points.toFixed(1)}</TableCell>
                      <TableCell>{entry.grossScore || '-'}</TableCell>
                      <TableCell>{entry.netScore || '-'}</TableCell>
                      <TableCell>{entry.handicap?.toFixed(1) || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="flex space-x-2">
            <Button 
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm & Save Tournament
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowPreview(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Warning Dialog */}
      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Manual Entry Warning</span>
            </DialogTitle>
            <DialogDescription className="space-y-3">
              <p>
                You are about to save a <strong>manual entry tournament</strong>. Please note:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>Manual entry tournaments <strong>cannot be edited</strong> after saving</li>
                <li>They will <strong>not be subject to automatic recalculations</strong></li>
                <li>Points, positions, and scores will be preserved exactly as entered</li>
                <li>You will need to create a new tournament if changes are needed</li>
              </ul>
              <p className="text-sm font-medium">
                Are you sure you want to proceed?
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setShowWarningDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmSubmit} className="bg-orange-600 hover:bg-orange-700">
              <AlertCircle className="h-4 w-4 mr-2" />
              Save Manual Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
