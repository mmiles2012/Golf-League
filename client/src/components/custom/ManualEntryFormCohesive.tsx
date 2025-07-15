import { useState, FormEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus, Eye, CheckCircle, AlertCircle, Save, AlertTriangle, PenSquare } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { TOURNAMENT_TYPES } from "@/lib/constants";
import { useQueryClient } from "@tanstack/react-query";
import PlayerSearchInput from "./PlayerSearchInput";

interface ManualPlayerEntry {
  id: number;
  playerId?: number;
  playerName: string;
  position: number;
  points: number;
  grossScore?: number;
  netScore?: number;
  handicap?: number;
}

interface PreviewResult {
  playerName: string;
  playerId: number | null;
  position: number;
  displayPosition: string;
  tiedPosition: boolean;
  grossScore: number | null;
  netScore: number | null;
  handicap: number | null;
  points: number;
  isNewPlayer: boolean;
}

interface TournamentPreview {
  tournament: {
    name: string;
    date: string;
    type: string;
    scoringType: string;
    isManual: boolean;
  };
  results: PreviewResult[];
  summary: {
    totalPlayers: number;
    newPlayers: number;
    existingPlayers: number;
    totalPoints: number;
    tiesDetected: boolean;
  };
}

export default function ManualEntryForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tournamentName, setTournamentName] = useState("");
  const [tournamentDate, setTournamentDate] = useState("");
  const [tournamentType, setTournamentType] = useState("");
  const [playerEntries, setPlayerEntries] = useState<ManualPlayerEntry[]>([
    { id: 1, playerName: "", position: 1, points: 0 }
  ]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [tournamentPreview, setTournamentPreview] = useState<TournamentPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<Array<{ type: string; message: string }>>([]);
  const [showManualWarning, setShowManualWarning] = useState(false);
  
  const [newPlayerDialogOpen, setNewPlayerDialogOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerEmail, setNewPlayerEmail] = useState("");
  const [newPlayerHandicap, setNewPlayerHandicap] = useState<number | undefined>();
  const [currentPlayerEntryId, setCurrentPlayerEntryId] = useState<number | null>(null);

  // Get tournament type info
  const selectedTournamentTypeInfo = TOURNAMENT_TYPES.find(t => t.value === tournamentType);
  const isManualTournament = selectedTournamentTypeInfo && !selectedTournamentTypeInfo.calculated;

  // Reset the form
  const resetForm = () => {
    setTournamentName("");
    setTournamentDate("");
    setTournamentType("");
    setPlayerEntries([{ id: 1, playerName: "", position: 1, points: 0 }]);
    setTournamentPreview(null);
    setShowPreview(false);
    setUploadErrors([]);
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

  const removePlayerEntry = (id: number) => {
    if (playerEntries.length > 1) {
      setPlayerEntries(playerEntries.filter(entry => entry.id !== id));
    }
  };

  const updatePlayerEntry = (id: number, field: keyof ManualPlayerEntry, value: any) => {
    setPlayerEntries(entries =>
      entries.map(entry =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
  };

  // Create new player
  const createPlayer = async () => {
    if (!newPlayerName.trim()) return;

    try {
      const response = await apiRequest("POST", "/api/players", {
        name: newPlayerName,
        email: newPlayerEmail || undefined,
        defaultHandicap: newPlayerHandicap
      });

      if (response && response.ok) {
        const newPlayer = await response.json();
        
        // Update the player entry with the new player ID
        if (currentPlayerEntryId) {
          updatePlayerEntry(currentPlayerEntryId, 'playerId', newPlayer.id);
        }

        toast({
          title: "Player created",
          description: `${newPlayerName} has been added to the system`,
        });

        // Reset dialog
        setNewPlayerDialogOpen(false);
        setNewPlayerName("");
        setNewPlayerEmail("");
        setNewPlayerHandicap(undefined);
        setCurrentPlayerEntryId(null);
      }
    } catch (error) {
      toast({
        title: "Error creating player",
        description: "Failed to create new player",
        variant: "destructive"
      });
    }
  };

  // Generate tournament preview
  const generateTournamentPreview = async () => {
    if (!tournamentName || !tournamentDate || !tournamentType || playerEntries.length === 0) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields and add at least one player",
        variant: "destructive"
      });
      return;
    }

    // Check if any player entries are incomplete
    const incompleteEntries = playerEntries.filter(entry => 
      !entry.playerName.trim() || entry.position < 1 || entry.points < 0
    );

    if (incompleteEntries.length > 0) {
      toast({
        title: "Incomplete entries",
        description: "Please fill in player name, position, and points for all entries",
        variant: "destructive"
      });
      return;
    }

    // Show warning for manual tournaments
    if (isManualTournament) {
      setShowManualWarning(true);
      return;
    }

    processPreview();
  };

  const processPreview = async () => {
    setIsProcessing(true);
    setUploadProgress(25);
    setUploadStatus("Generating tournament preview...");
    setUploadErrors([]);

    try {
      // Process the manual entries
      const processedResults = playerEntries.map(entry => ({
        player: entry.playerName,
        position: entry.position,
        points: isManualTournament ? entry.points : undefined, // Only include points for manual tournaments
        grossScore: entry.grossScore,
        netScore: entry.netScore,
        handicap: entry.handicap
      }));

      setUploadProgress(50);
      setUploadStatus("Validating data and calculating points...");

      // Choose the appropriate preview endpoint
      const endpoint = isManualTournament ? "/api/tournaments/manual-preview" : "/api/tournaments/preview";
      
      const previewResponse = await apiRequest("POST", endpoint, {
        name: tournamentName,
        date: tournamentDate,
        type: tournamentType,
        scoringType: isManualTournament ? "Manual Entry" : "Auto-calculated",
        results: processedResults
      });

      if (previewResponse && previewResponse.ok) {
        const previewData = await previewResponse.json() as TournamentPreview;
        setTournamentPreview(previewData);
        setShowPreview(true);
        setUploadProgress(100);
        setUploadStatus("Preview generated successfully! Review the results below.");
      } else {
        throw new Error("Failed to generate preview");
      }
      
    } catch (error) {
      console.error("Error generating preview:", error);
      setUploadErrors([{
        type: 'preview',
        message: error instanceof Error ? error.message : 'Failed to generate tournament preview. Please check your data and try again.'
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process the tournament after user confirms the preview
  const processTournament = async () => {
    if (!tournamentPreview) return;

    setIsProcessing(true);
    setUploadProgress(0);
    setUploadStatus("Processing tournament...");

    try {
      // Choose the appropriate processing endpoint
      const endpoint = isManualTournament ? "/api/tournaments/manual-entry" : "/api/tournaments/process";
      
      const processResponse = await apiRequest("POST", endpoint, {
        name: tournamentPreview.tournament.name,
        date: tournamentPreview.tournament.date,
        type: tournamentPreview.tournament.type,
        scoringType: tournamentPreview.tournament.scoringType,
        isManualEntry: isManualTournament,
        results: tournamentPreview.results.map(r => ({
          playerId: r.playerId,
          playerName: r.playerName,
          position: r.position,
          points: r.points,
          grossScore: r.grossScore,
          netScore: r.netScore,
          handicap: r.handicap
        }))
      });

      if (processResponse && processResponse.ok) {
        setUploadProgress(100);
        setUploadStatus("Tournament processed successfully!");
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
        queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/net"] });
        queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/gross"] });
        
        toast({
          title: "Success",
          description: `Tournament has been processed successfully!${isManualTournament ? ' Points will not be recalculated.' : ''}`,
        });

        resetForm();
      } else {
        throw new Error("Failed to process tournament");
      }

    } catch (error) {
      console.error("Processing error:", error);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getTournamentTypeLabel = (type: string) => {
    const typeConfig = TOURNAMENT_TYPES.find(t => t.value === type);
    return typeConfig ? typeConfig.label : type;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenSquare className="h-5 w-5" />
            Manual Tournament Entry
          </CardTitle>
          <CardDescription>
            Enter tournament results manually for small tournaments or events that don't require spreadsheet import
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); generateTournamentPreview(); }} className="space-y-4">
            {/* Tournament Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="tournament-name">Tournament Name</Label>
                <Input 
                  id="tournament-name" 
                  type="text" 
                  placeholder="Enter tournament name" 
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tournament-date">Tournament Date</Label>
                <Input 
                  id="tournament-date" 
                  type="date" 
                  value={tournamentDate}
                  onChange={(e) => setTournamentDate(e.target.value)}
                  disabled={isProcessing}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="tournament-type">Tournament Type</Label>
              <Select 
                value={tournamentType} 
                onValueChange={setTournamentType}
                disabled={isProcessing}
              >
                <SelectTrigger id="tournament-type">
                  <SelectValue placeholder="Select tournament type" />
                </SelectTrigger>
                <SelectContent>
                  {TOURNAMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                      {!type.calculated && <Badge variant="secondary" className="ml-2">Manual Scoring</Badge>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isManualTournament && (
                <Alert className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Manual tournaments require you to enter points directly. Points will not be recalculated.
                  </AlertDescription>
                </Alert>
              )}
              {!isManualTournament && tournamentType && (
                <Alert className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Points will be automatically calculated based on position and tournament type.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Player Entries */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Player Results</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPlayerEntry}
                  disabled={isProcessing}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Player
                </Button>
              </div>

              <div className="space-y-3">
                {playerEntries.map((entry) => (
                  <div key={entry.id} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end p-3 border rounded-lg">
                    <div className="md:col-span-2">
                      <Label className="text-xs">Player Name *</Label>
                      <PlayerSearchInput
                        value={entry.playerName}
                        onChange={(value: string) => updatePlayerEntry(entry.id, 'playerName', value)}
                        onSelect={(playerId: number, playerName: string) => {
                          updatePlayerEntry(entry.id, 'playerId', playerId);
                          updatePlayerEntry(entry.id, 'playerName', playerName);
                        }}
                        onNotFound={() => {
                          setCurrentPlayerEntryId(entry.id);
                          setNewPlayerName(entry.playerName);
                          setNewPlayerDialogOpen(true);
                        }}
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Position *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={entry.position}
                        onChange={(e) => updatePlayerEntry(entry.id, 'position', parseInt(e.target.value) || 1)}
                        disabled={isProcessing}
                      />
                    </div>
                    {isManualTournament && (
                      <div>
                        <Label className="text-xs">Points *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={entry.points}
                          onChange={(e) => updatePlayerEntry(entry.id, 'points', parseFloat(e.target.value) || 0)}
                          disabled={isProcessing}
                        />
                      </div>
                    )}
                    <div>
                      <Label className="text-xs">Gross Score</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Optional"
                        value={entry.grossScore || ""}
                        onChange={(e) => updatePlayerEntry(entry.id, 'grossScore', e.target.value ? parseFloat(e.target.value) : undefined)}
                        disabled={isProcessing}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Net Score</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Optional"
                        value={entry.netScore || ""}
                        onChange={(e) => updatePlayerEntry(entry.id, 'netScore', e.target.value ? parseFloat(e.target.value) : undefined)}
                        disabled={isProcessing}
                      />
                    </div>
                    <div className="flex items-end">
                      {playerEntries.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removePlayerEntry(entry.id)}
                          disabled={isProcessing}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-sm text-gray-600">{uploadStatus}</p>
              </div>
            )}

            {uploadErrors.length > 0 && (
              <div className="space-y-2">
                {uploadErrors.map((error, index) => (
                  <div key={index} className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <p className="text-sm text-red-600">{error.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex space-x-2">
              <Button 
                type="submit" 
                disabled={isProcessing || !tournamentName || !tournamentDate || !tournamentType || playerEntries.length === 0}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                Generate Preview
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={resetForm}
                disabled={isProcessing}
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tournament Preview Section */}
      {showPreview && tournamentPreview && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Tournament Preview</span>
            </CardTitle>
            <CardDescription>
              Review the tournament details and {isManualTournament ? 'manual points' : 'calculated points'} before processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tournament Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-500">Tournament</p>
                <p className="text-lg font-semibold">{tournamentPreview.tournament.name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">{getTournamentTypeLabel(tournamentPreview.tournament.type)}</p>
                  {isManualTournament && <Badge variant="secondary">Manual</Badge>}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Players</p>
                <p className="text-lg font-semibold">{tournamentPreview.summary.totalPlayers}</p>
                <p className="text-sm text-gray-600">Participants</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Points</p>
                <p className="text-lg font-semibold">{tournamentPreview.summary.totalPoints}</p>
                <p className="text-sm text-gray-600">{isManualTournament ? 'Assigned' : 'Calculated'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">New Players</p>
                <p className="text-lg font-semibold">{tournamentPreview.summary.newPlayers}</p>
                <p className="text-sm text-gray-600">To be created</p>
              </div>
            </div>

            {/* Results Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Position</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Gross Score</TableHead>
                    <TableHead>Net Score</TableHead>
                    <TableHead>Handicap</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tournamentPreview.results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <span>{result.displayPosition}</span>
                          {result.tiedPosition && <Badge variant="outline" className="text-xs">T</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{result.playerName}</TableCell>
                      <TableCell>
                        <Badge variant={isManualTournament ? "secondary" : "default"}>
                          {result.points}
                        </Badge>
                      </TableCell>
                      <TableCell>{result.grossScore || "-"}</TableCell>
                      <TableCell>{result.netScore || "-"}</TableCell>
                      <TableCell>{result.handicap || "-"}</TableCell>
                      <TableCell>
                        {result.isNewPlayer ? (
                          <Badge variant="secondary">New Player</Badge>
                        ) : (
                          <Badge variant="outline">Existing</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-4">
              <Button 
                onClick={processTournament}
                disabled={isProcessing}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {isProcessing ? "Processing..." : "Process Tournament"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowPreview(false)}
                disabled={isProcessing}
              >
                Edit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Tournament Warning Dialog */}
      <Dialog open={showManualWarning} onOpenChange={setShowManualWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Manual Tournament Warning
            </DialogTitle>
            <DialogDescription>
              You are about to create a manually scored tournament. Please confirm:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <ul className="text-sm space-y-1">
                <li>• Points will be taken directly from your entries</li>
                <li>• No automatic point calculations will be performed</li>
                <li>• This tournament cannot be recalculated if points systems change</li>
                <li>• You have assigned points directly to each player</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualWarning(false)}>
              Cancel
            </Button>
            <Button onClick={() => { setShowManualWarning(false); processPreview(); }}>
              Proceed with Manual Tournament
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
              Add a new player to the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-player-name">Player Name</Label>
              <Input
                id="new-player-name"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Enter player name"
              />
            </div>
            <div>
              <Label htmlFor="new-player-email">Email (Optional)</Label>
              <Input
                id="new-player-email"
                type="email"
                value={newPlayerEmail}
                onChange={(e) => setNewPlayerEmail(e.target.value)}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label htmlFor="new-player-handicap">Default Handicap (Optional)</Label>
              <Input
                id="new-player-handicap"
                type="number"
                step="0.1"
                value={newPlayerHandicap || ""}
                onChange={(e) => setNewPlayerHandicap(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="Enter handicap"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPlayerDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createPlayer} disabled={!newPlayerName.trim()}>
              Create Player
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
