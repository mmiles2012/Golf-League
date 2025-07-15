import { useState, ChangeEvent, FormEvent } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Upload, 
  FileUp, 
  Eye, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  AlertTriangle, 
  FileSpreadsheet, 
  PenSquare, 
  Plus, 
  Trash2, 
  Save 
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { TOURNAMENT_TYPES, SCORING_MODES, SCORING_TYPES, SUPPORTED_FILE_EXTENSIONS } from "@/lib/constants";
import { downloadSampleSpreadsheet, getRequiredFields, getFieldDescriptions } from "@/lib/sample-spreadsheet-generator";
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
    scoringMode: string;
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

type EntryMode = 'file' | 'manual';

export default function UnifiedTournamentEntry() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Common tournament fields
  const [tournamentName, setTournamentName] = useState("");
  const [tournamentDate, setTournamentDate] = useState("");
  const [tournamentType, setTournamentType] = useState("");
  const [scoringMode, setScoringMode] = useState<'calculated' | 'manual'>('calculated');
  const [scoringType, setScoringType] = useState<'net' | 'gross' | 'both'>('both');

  // Entry mode selection
  const [entryMode, setEntryMode] = useState<EntryMode>('file');

  // File upload fields
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");

  // Manual entry fields
  const [playerEntries, setPlayerEntries] = useState<ManualPlayerEntry[]>([
    { id: 1, playerName: "", position: 1, points: 0 }
  ]);
  const [spreadsheetData, setSpreadsheetData] = useState("");
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [tournamentPreview, setTournamentPreview] = useState<TournamentPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<Array<{ type: string; message: string }>>([]);
  const [showManualWarning, setShowManualWarning] = useState(false);
  
  // New player creation
  const [newPlayerDialogOpen, setNewPlayerDialogOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerEmail, setNewPlayerEmail] = useState("");
  const [newPlayerHandicap, setNewPlayerHandicap] = useState<number | undefined>();
  const [currentPlayerEntryId, setCurrentPlayerEntryId] = useState<number | null>(null);

  // Get required fields based on current configuration
  const requiredFields = getRequiredFields(scoringMode, scoringType);
  const fieldDescriptions = getFieldDescriptions(scoringMode);

  // Reset the form
  const resetForm = () => {
    setTournamentName("");
    setTournamentDate("");
    setTournamentType("");
    setScoringMode('calculated');
    setScoringType('both');
    setSelectedFile(null);
    setFileName("");
    setPlayerEntries([{ id: 1, playerName: "", position: 1, points: 0 }]);
    setSpreadsheetData("");
    setTournamentPreview(null);
    setShowPreview(false);
    setUploadErrors([]);
    setUploadProgress(0);
    setUploadStatus("");
  };

  // Handle file operations
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;

    if (file) {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!SUPPORTED_FILE_EXTENSIONS.includes(extension)) {
        toast({
          title: "Invalid file type",
          description: `Please upload a supported file: ${SUPPORTED_FILE_EXTENSIONS.join(', ')}`,
          variant: "destructive"
        });
        return;
      }

      setSelectedFile(file);
      setFileName(file.name);
      setShowPreview(false);
      setTournamentPreview(null);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0] || null;

    if (file) {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!SUPPORTED_FILE_EXTENSIONS.includes(extension)) {
        toast({
          title: "Invalid file type",
          description: `Please upload a supported file: ${SUPPORTED_FILE_EXTENSIONS.join(', ')}`,
          variant: "destructive"
        });
        return;
      }

      setSelectedFile(file);
      setFileName(file.name);
      setShowPreview(false);
      setTournamentPreview(null);
    }
  };

  // Handle manual entry operations
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

  // Parse spreadsheet data for manual entry
  const parseSpreadsheetData = () => {
    if (!spreadsheetData.trim()) return;

    try {
      const lines = spreadsheetData.trim().split('\n');
      const parsedEntries: ManualPlayerEntry[] = [];

      lines.forEach((line, index) => {
        const columns = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
        if (columns.length >= 3) {
          const playerName = columns[0]?.trim() || "";
          const position = parseInt(columns[1]?.trim()) || (index + 1);
          const points = parseFloat(columns[2]?.trim()) || 0;
          const grossScore = columns[3] ? parseFloat(columns[3].trim()) : undefined;
          const netScore = columns[4] ? parseFloat(columns[4].trim()) : undefined;
          const handicap = columns[5] ? parseFloat(columns[5].trim()) : undefined;

          if (playerName) {
            parsedEntries.push({
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

      if (parsedEntries.length > 0) {
        setPlayerEntries(parsedEntries);
        setSpreadsheetData("");
        toast({
          title: "Data parsed",
          description: `Successfully parsed ${parsedEntries.length} player entries`,
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

      if (response && response.ok) {
        const newPlayer = await response.json();
        
        if (currentPlayerEntryId) {
          updatePlayerEntry(currentPlayerEntryId, 'playerId', newPlayer.id);
        }

        toast({
          title: "Player created",
          description: `${newPlayerName} has been added to the system`,
        });

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

  // Download sample spreadsheet
  const downloadSample = () => {
    try {
      downloadSampleSpreadsheet(scoringMode, scoringType, tournamentType || 'tour');
      toast({
        title: "Sample downloaded",
        description: "Sample spreadsheet has been downloaded to help you format your data correctly",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to generate sample spreadsheet",
        variant: "destructive"
      });
    }
  };

  // Generate tournament preview
  const generateTournamentPreview = async () => {
    if (!tournamentName || !tournamentDate || !tournamentType) {
      toast({
        title: "Missing information",
        description: "Please fill in all required tournament fields",
        variant: "destructive"
      });
      return;
    }

    // Validate based on entry mode
    if (entryMode === 'file' && !selectedFile) {
      toast({
        title: "Missing file",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }

    if (entryMode === 'manual') {
      const incompleteEntries = playerEntries.filter(entry => 
        !entry.playerName.trim() || entry.position < 1 || (scoringMode === 'manual' && entry.points < 0)
      );

      if (incompleteEntries.length > 0) {
        toast({
          title: "Incomplete entries",
          description: "Please fill in all required fields for each player",
          variant: "destructive"
        });
        return;
      }
    }

    // Show warning for manual tournaments
    if (scoringMode === 'manual') {
      setShowManualWarning(true);
      return;
    }

    await processPreview();
  };

  const processPreview = async () => {
    setIsProcessing(true);
    setUploadProgress(25);
    setUploadStatus(entryMode === 'file' ? "Reading and parsing file..." : "Generating tournament preview...");
    setUploadErrors([]);

    try {
      let endpoint: string;
      let requestData: any;

      if (entryMode === 'file') {
        // File upload preview
        const formData = new FormData();
        formData.append("file", selectedFile!);
        formData.append("name", tournamentName);
        formData.append("date", tournamentDate);
        formData.append("type", tournamentType);
        formData.append("scoringMode", scoringMode);
        formData.append("scoringType", scoringType);

        endpoint = scoringMode === 'manual' ? "/api/tournaments/manual-preview" : "/api/tournaments/preview";
        requestData = formData;
      } else {
        // Manual entry preview
        const processedResults = playerEntries.map(entry => ({
          player: entry.playerName,
          position: entry.position,
          points: scoringMode === 'manual' ? entry.points : undefined,
          grossScore: entry.grossScore,
          netScore: entry.netScore,
          handicap: entry.handicap
        }));

        endpoint = scoringMode === 'manual' ? "/api/tournaments/manual-preview" : "/api/tournaments/preview";
        requestData = {
          name: tournamentName,
          date: tournamentDate,
          type: tournamentType,
          scoringMode,
          scoringType,
          results: processedResults
        };
      }

      setUploadProgress(50);
      setUploadStatus("Calculating points and validating data...");

      const response = await apiRequest("POST", endpoint, requestData);

      if (response && response.ok) {
        const previewData = await response.json() as TournamentPreview;
        setTournamentPreview(previewData);
        setShowPreview(true);
        setUploadProgress(100);
        setUploadStatus("Preview generated successfully! Review the results below.");
      } else {
        throw new Error("Failed to generate preview");
      }
      
    } catch (error) {
      console.error("Preview error:", error);
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
      let endpoint: string;
      let requestData: any;

      if (entryMode === 'file') {
        // File upload processing
        const formData = new FormData();
        formData.append("file", selectedFile!);
        formData.append("name", tournamentPreview.tournament.name);
        formData.append("date", tournamentPreview.tournament.date);
        formData.append("type", tournamentPreview.tournament.type);
        formData.append("scoringMode", scoringMode);
        formData.append("scoringType", scoringType);

        endpoint = scoringMode === 'manual' ? "/api/tournaments/manual-entry" : "/api/tournaments/process";
        requestData = formData;
      } else {
        // Manual entry processing
        endpoint = scoringMode === 'manual' ? "/api/tournaments/manual-entry" : "/api/tournaments/process";
        requestData = {
          name: tournamentPreview.tournament.name,
          date: tournamentPreview.tournament.date,
          type: tournamentPreview.tournament.type,
          scoringMode,
          scoringType,
          isManualEntry: entryMode === 'manual',
          results: tournamentPreview.results.map(r => ({
            playerId: r.playerId,
            playerName: r.playerName,
            position: r.position,
            points: r.points,
            grossScore: r.grossScore,
            netScore: r.netScore,
            handicap: r.handicap
          }))
        };
      }
      
      const processResponse = await apiRequest("POST", endpoint, requestData);

      if (processResponse && processResponse.ok) {
        setUploadProgress(100);
        setUploadStatus("Tournament processed successfully!");
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
        queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/net"] });
        queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/gross"] });
        
        toast({
          title: "Success",
          description: `Tournament has been processed successfully!${scoringMode === 'manual' ? ' Points will not be recalculated.' : ''}`,
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
                Tournament Entry System
                <Badge variant="secondary" className="bg-green-100 text-green-800">Unified v4.0</Badge>
              </CardTitle>
              <CardDescription>
                Create tournaments by uploading files or entering results manually with flexible scoring options
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); generateTournamentPreview(); }} className="space-y-6">
            {/* Entry Mode Selection */}
            <div className="space-y-3">
              <Label>Entry Method</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={entryMode === "file" ? "default" : "outline"}
                  onClick={() => setEntryMode("file")}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  File Upload
                </Button>
                <Button
                  type="button"
                  variant={entryMode === "manual" ? "default" : "outline"}
                  onClick={() => setEntryMode("manual")}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  <PenSquare className="h-4 w-4 mr-2" />
                  Manual Entry
                </Button>
              </div>
            </div>

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

            {/* Tournament Type Selection */}
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
              <p className="text-sm text-neutral-500 mt-1">
                Choose the tournament category for point calculation
              </p>
            </div>

            {/* Scoring Mode Selection */}
            <div className="space-y-3">
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

            {/* Scoring Type Selection (for calculated tournaments) */}
            {scoringMode === 'calculated' && (
              <div className="space-y-1">
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
                  Determines what score fields are required
                </p>
              </div>
            )}

            {/* Required Fields Display */}
            {entryMode === 'file' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Required Spreadsheet Columns</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {requiredFields.map((field) => (
                    <div key={field} className="text-sm">
                      <span className="font-medium text-blue-800">{field}</span>
                      {fieldDescriptions[field] && (
                        <p className="text-blue-600 text-xs">{fieldDescriptions[field]}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sample Download */}
            {entryMode === 'file' && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                <div>
                  <h4 className="font-medium text-gray-900">Need a template?</h4>
                  <p className="text-sm text-gray-600">Download a sample spreadsheet with the correct format</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadSample}
                  disabled={!tournamentType}
                  className="flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Download Sample
                </Button>
              </div>
            )}

            {/* File Upload Section */}
            {entryMode === 'file' && (
              <div
                className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-neutral-400 transition-colors cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept={SUPPORTED_FILE_EXTENSIONS.join(',')}
                  onChange={handleFileChange}
                  disabled={isProcessing}
                />
                
                {selectedFile ? (
                  <div className="space-y-2">
                    <FileUp className="mx-auto h-8 w-8 text-green-600" />
                    <p className="text-sm font-medium">{fileName}</p>
                    <p className="text-xs text-neutral-500">Click to choose a different file</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="mx-auto h-8 w-8 text-neutral-400" />
                    <p className="text-sm text-neutral-600">
                      Drag and drop your file here, or <span className="font-medium">click to browse</span>
                    </p>
                    <p className="text-xs text-neutral-500">
                      Supports: {SUPPORTED_FILE_EXTENSIONS.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Manual Entry Section */}
            {entryMode === 'manual' && (
              <div className="space-y-4">
                {/* Spreadsheet Paste Option */}
                <div className="space-y-3">
                  <Label htmlFor="spreadsheet-data">Quick Entry (Optional)</Label>
                  <Textarea
                    id="spreadsheet-data"
                    placeholder="Paste tab or comma-separated data: Player Name, Position, Points, Gross Score (optional), Net Score (optional), Handicap (optional)"
                    value={spreadsheetData}
                    onChange={(e) => setSpreadsheetData(e.target.value)}
                    disabled={isProcessing}
                    rows={4}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={parseSpreadsheetData}
                    disabled={isProcessing || !spreadsheetData.trim()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Parse Data
                  </Button>
                </div>

                {/* Individual Player Entries */}
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
                        {scoringMode === 'manual' && (
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
              </div>
            )}

            {/* Processing Progress */}
            {isProcessing && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-sm text-gray-600">{uploadStatus}</p>
              </div>
            )}

            {/* Error Display */}
            {uploadErrors.length > 0 && (
              <div className="space-y-2">
                {uploadErrors.map((error, index) => (
                  <Alert key={index} variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error.message}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <Button 
                type="submit" 
                disabled={isProcessing || !tournamentName || !tournamentDate || !tournamentType || 
                  (entryMode === 'file' && !selectedFile) || 
                  (entryMode === 'manual' && playerEntries.length === 0)}
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
              Review the tournament details and {scoringMode === 'manual' ? 'manual points' : 'calculated points'} before processing
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
                  {scoringMode === 'manual' && <Badge variant="secondary">Manual</Badge>}
                  <Badge variant="outline">{entryMode === 'file' ? 'File' : 'Manual'}</Badge>
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
                <p className="text-sm text-gray-600">{scoringMode === 'manual' ? 'Assigned' : 'Calculated'}</p>
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
                    {(scoringType === 'gross' || scoringType === 'both') && <TableHead>Gross Score</TableHead>}
                    {(scoringType === 'net' || scoringType === 'both') && <TableHead>Net Score</TableHead>}
                    {(scoringType === 'net' || scoringType === 'both') && <TableHead>Handicap</TableHead>}
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
                        <Badge variant={scoringMode === 'manual' ? "secondary" : "default"}>
                          {result.points}
                        </Badge>
                      </TableCell>
                      {(scoringType === 'gross' || scoringType === 'both') && <TableCell>{result.grossScore || "-"}</TableCell>}
                      {(scoringType === 'net' || scoringType === 'both') && <TableCell>{result.netScore || "-"}</TableCell>}
                      {(scoringType === 'net' || scoringType === 'both') && <TableCell>{result.handicap || "-"}</TableCell>}
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
