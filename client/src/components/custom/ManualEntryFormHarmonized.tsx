import { useState, FormEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus, Eye, CheckCircle, AlertCircle, Save, FileSpreadsheet, PenSquare } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { TOURNAMENT_TYPES, SCORING_MODES, SCORING_TYPES } from "@/lib/constants";
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

export default function ManualEntryFormHarmonized() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tournamentName, setTournamentName] = useState("");
  const [tournamentDate, setTournamentDate] = useState("");
  const [tournamentType, setTournamentType] = useState("");
  const [scoringMode, setScoringMode] = useState<'calculated' | 'manual'>('manual');
  const [scoringType, setScoringType] = useState<'net' | 'gross' | 'both'>('both');
  const [inputMode, setInputMode] = useState<"individual" | "spreadsheet">("individual");
  const [spreadsheetData, setSpreadsheetData] = useState("");
  const [playerEntries, setPlayerEntries] = useState<ManualPlayerEntry[]>([
    { id: 1, playerName: "", position: 1, points: 0 }
  ]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [tournamentPreview, setTournamentPreview] = useState<TournamentPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<Array<{ type: string; message: string }>>([]);
  
  const [newPlayerDialogOpen, setNewPlayerDialogOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerEmail, setNewPlayerEmail] = useState("");
  const [newPlayerHandicap, setNewPlayerHandicap] = useState<number | undefined>();
  const [currentPlayerEntryId, setCurrentPlayerEntryId] = useState<number | null>(null);

  // Reset the form
  const resetForm = () => {
    setTournamentName("");
    setTournamentDate("");
    setTournamentType("");
    setScoringMode('manual');
    setScoringType('both');
    setSpreadsheetData("");
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
      const entries: ManualPlayerEntry[] = [];
      
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
          const grossScore = parts[3] ? parseFloat(parts[3]) : undefined;
          const netScore = parts[4] ? parseFloat(parts[4]) : undefined;
          const handicap = parts[5] ? parseFloat(parts[5]) : undefined;

          if (!isNaN(position) && !isNaN(points)) {
            entries.push({
              id: index + 1,
              playerName,
              position,
              points,
              grossScore,
              netScore,
              handicap
            });
          }
        }
      });

      if (entries.length > 0) {
        setPlayerEntries(entries);
        toast({
          title: "Data parsed successfully",
          description: `Imported ${entries.length} player entries`,
        });
      } else {
        toast({
          title: "No valid data found",
          description: "Please check your format: Player Name, Position, Points, [Gross Score], [Net Score], [Handicap]",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Parse error",
        description: "Failed to parse spreadsheet data. Please check the format.",
        variant: "destructive"
      });
    }
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

      if (response.ok) {
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

    setIsProcessing(true);
    setUploadProgress(25);
    setUploadStatus("Generating tournament preview...");
    setUploadErrors([]);

    try {
      // Process the manual entries
      const processedResults = playerEntries.map(entry => ({
        player: entry.playerName,
        position: entry.position,
        points: entry.points, // Direct points for manual entry
        grossScore: entry.grossScore,
        netScore: entry.netScore,
        handicap: entry.handicap
      }));

      setUploadProgress(50);
      setUploadStatus("Calculating points and validating data...");

      // Call the manual entry preview API (we'll need to create this)
      const previewResponse = await apiRequest("POST", "/api/tournaments/manual-entry-preview", {
        name: tournamentName,
        date: tournamentDate,
        type: tournamentType,
        scoringType: scoringType,
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
        message: 'Failed to generate tournament preview. Please check your data and try again.'
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
    setUploadStatus("Processing manual tournament entry...");

    try {
      // Process the tournament data with the results from preview
      const processResponse = await apiRequest("POST", "/api/tournaments/manual-entry", {
        name: tournamentPreview.tournament.name,
        date: tournamentPreview.tournament.date,
        type: tournamentPreview.tournament.type,
        scoringType: tournamentPreview.tournament.scoringType,
        results: tournamentPreview.results.map(r => ({
          playerId: r.playerId,
          playerName: r.playerName,
          position: r.position,
          points: r.points, // Use direct points from manual entry
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
          description: "Manual tournament entry has been processed and will not be subject to automatic recalculations!",
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Manual Tournament Entry
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">Harmonized v3.0</Badge>
              </CardTitle>
              <CardDescription>
                Enter tournament results manually with direct points assignment. These results will not be subject to automatic recalculations.
              </CardDescription>
            </div>
          </div>
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
                />              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
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
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-neutral-500 mt-1">Choose the tournament category for point calculation</p>
            </div>

            {/* Scoring Mode Selection */}
            <div className="space-y-3 md:col-span-2">
              <Label>Scoring Mode</Label>
              <RadioGroup 
                value={scoringMode} 
                onValueChange={(value: 'calculated' | 'manual') => setScoringMode(value)}
                disabled={isProcessing}
                className="space-y-2"
              >
                {SCORING_MODES.map((mode) => (
                  <div key={mode.value} className="flex items-start space-x-2">
                    <RadioGroupItem value={mode.value} id={mode.value} className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor={mode.value} className="font-medium">{mode.label}</Label>
                      <p className="text-sm text-neutral-500">{mode.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Scoring Type Selection */}
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="scoring-type">Scoring Type</Label>
              <Select 
                value={scoringType} 
                onValueChange={(value: 'net' | 'gross' | 'both') => setScoringType(value)}
                disabled={isProcessing}
              >
                <SelectTrigger id="scoring-type">
                  <SelectValue placeholder="Select scoring type" />
                </SelectTrigger>
                <SelectContent>
                  {SCORING_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-neutral-500 mt-1">
                Determines what score fields are available for each player entry
              </p>
            </div>
            </div>

            {/* Input Mode Selection */}
            <div className="space-y-2">
              <Label>Entry Mode</Label>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant={inputMode === "individual" ? "default" : "outline"}
                  onClick={() => setInputMode("individual")}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <PenSquare className="h-4 w-4 mr-2" />
                  Individual Entry
                </Button>
                <Button
                  type="button"
                  variant={inputMode === "spreadsheet" ? "default" : "outline"}
                  onClick={() => setInputMode("spreadsheet")}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Spreadsheet Paste
                </Button>
              </div>
            </div>

            {/* Individual Entry Mode */}
            {inputMode === "individual" && (
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
                        <Label className="text-xs">Player Name</Label>
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
                        <Label className="text-xs">Position</Label>
                        <Input
                          type="number"
                          min="1"
                          value={entry.position}
                          onChange={(e) => updatePlayerEntry(entry.id, 'position', parseInt(e.target.value) || 1)}
                          disabled={isProcessing}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Points</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={entry.points}
                          onChange={(e) => updatePlayerEntry(entry.id, 'points', parseFloat(e.target.value) || 0)}
                          disabled={isProcessing}
                        />
                      </div>
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
            )}

            {/* Spreadsheet Mode */}
            {inputMode === "spreadsheet" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="spreadsheet-data">Spreadsheet Data</Label>
                  <Textarea
                    id="spreadsheet-data"
                    placeholder="Paste data here: Player Name, Position, Points, Gross Score (optional), Net Score (optional), Handicap (optional)
Example:
John Doe	1	100	72	68	4
Jane Smith	2	75	74	70	4"
                    value={spreadsheetData}
                    onChange={(e) => setSpreadsheetData(e.target.value)}
                    rows={6}
                    disabled={isProcessing}
                  />
                  <p className="text-sm text-neutral-500 mt-1">
                    Tab or comma-separated values. Format: Player Name, Position, Points, [Gross Score], [Net Score], [Handicap]
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={parseSpreadsheetData}
                  disabled={isProcessing || !spreadsheetData.trim()}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Parse Data
                </Button>

                {playerEntries.length > 0 && (
                  <div className="text-sm text-green-600">
                    ✓ Parsed {playerEntries.length} player entries
                  </div>
                )}
              </div>
            )}

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
              Review the tournament details and player entries before processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tournament Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-500">Tournament</p>
                <p className="text-lg font-semibold">{tournamentPreview.tournament.name}</p>
                <p className="text-sm text-gray-600">{getTournamentTypeLabel(tournamentPreview.tournament.type)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Players</p>
                <p className="text-lg font-semibold">{tournamentPreview.summary.totalPlayers}</p>
                <p className="text-sm text-gray-600">Participants</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Points</p>
                <p className="text-lg font-semibold">{tournamentPreview.summary.totalPoints}</p>
                <p className="text-sm text-gray-600">Assigned</p>
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
                        <Badge variant="default">{result.points}</Badge>
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
