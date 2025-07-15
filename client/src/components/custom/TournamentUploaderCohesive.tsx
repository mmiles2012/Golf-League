import { useState, ChangeEvent, FormEvent } from "react";
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
import { Upload, FileUp, Eye, CheckCircle, AlertCircle, Download, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { TOURNAMENT_TYPES, SUPPORTED_FILE_EXTENSIONS } from "@/lib/constants";
import { useQueryClient } from "@tanstack/react-query";

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

export default function TournamentUploader() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tournamentName, setTournamentName] = useState("");
  const [tournamentDate, setTournamentDate] = useState("");
  const [tournamentType, setTournamentType] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [tournamentPreview, setTournamentPreview] = useState<TournamentPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<Array<{ type: string; message: string }>>([]);
  const [showManualWarning, setShowManualWarning] = useState(false);

  // Get tournament type info
  const selectedTournamentTypeInfo = TOURNAMENT_TYPES.find(t => t.value === tournamentType);
  const isManualTournament = selectedTournamentTypeInfo && !selectedTournamentTypeInfo.calculated;

  // Reset the form
  const resetForm = () => {
    setTournamentName("");
    setTournamentDate("");
    setTournamentType("");
    setSelectedFile(null);
    setFileName("");
    setTournamentPreview(null);
    setShowPreview(false);
    setUploadErrors([]);
    setUploadProgress(0);
    setUploadStatus("");
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;

    if (file) {
      // Check if the file is a supported format
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

  // Generate tournament preview
  const generateTournamentPreview = async (uploadedData: any[]) => {
    try {
      setUploadStatus("Generating tournament preview...");
      
      // Process the uploaded data based on tournament type
      const processedResults = uploadedData.map((row: any, index: number) => {
        // Extract player name with multiple fallback options
        const playerName = row["Player Name"] || row["Player"] || row["Name"] || row["player"] || row["name"] || "";
        
        // Extract position
        const position = parseInt(String(row["Position"] || row["Pos"] || row["position"] || (index + 1)));
        
        let result = {
          player: playerName,
          position: position,
          grossScore: row["Gross Score"] || row["Gross"] ? parseFloat(String(row["Gross Score"] || row["Gross"])) : null,
          netScore: row["Net Score"] || row["Net"] ? parseFloat(String(row["Net Score"] || row["Net"])) : null,
          handicap: row["Course Handicap"] || row["Handicap"] ? parseFloat(String(row["Course Handicap"] || row["Handicap"])) : null
        };

        // For manual tournaments, extract points directly
        if (isManualTournament) {
          const points = row["Points"] || row["points"];
          if (points !== undefined && points !== null && points !== "") {
            (result as any).points = parseFloat(String(points));
          } else {
            throw new Error(`Missing points for player ${playerName} in manually scored tournament`);
          }
        }

        return result;
      });

      // Choose the appropriate preview endpoint
      const endpoint = isManualTournament ? "/api/tournaments/manual-preview" : "/api/tournaments/preview";
      
      const previewResponse = await apiRequest("POST", endpoint, {
        name: tournamentName,
        date: tournamentDate,
        type: tournamentType,
        scoringType: isManualTournament ? "Manual" : "Auto-calculated",
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
      setIsUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!tournamentName || !tournamentDate || !tournamentType || !selectedFile) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields and select a file",
        variant: "destructive"
      });
      return;
    }

    // Show warning for manual tournaments
    if (isManualTournament) {
      setShowManualWarning(true);
      return;
    }

    processUpload();
  };

  const processUpload = async () => {
    setIsUploading(true);
    setUploadProgress(10);
    setUploadStatus("Uploading file...");
    setUploadErrors([]);

    try {
      // Upload the file
      const formData = new FormData();
      formData.append("file", selectedFile!);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      setUploadProgress(50);
      setUploadStatus("Processing tournament data...");

      // Generate tournament preview
      await generateTournamentPreview(data.preview);

    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  // Process the tournament after user confirms the preview
  const processTournament = async () => {
    if (!tournamentPreview) return;

    setIsUploading(true);
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
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    // Create CSV template based on tournament type
    let csvContent = "";
    
    if (isManualTournament) {
      csvContent = "Player Name,Position,Points,Gross Score,Net Score,Course Handicap\n";
      csvContent += "John Doe,1,100,72,68,4\n";
      csvContent += "Jane Smith,2,75,74,70,4\n";
      csvContent += "Bob Johnson,3,60,76,72,4\n";
    } else {
      csvContent = "Player Name,Position,Gross Score,Net Score,Course Handicap\n";
      csvContent += "John Doe,1,72,68,4\n";
      csvContent += "Jane Smith,2,74,70,4\n";
      csvContent += "Bob Johnson,3,76,72,4\n";
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tournament-template-${isManualTournament ? 'manual' : 'calculated'}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const getTournamentTypeLabel = (type: string) => {
    const typeConfig = TOURNAMENT_TYPES.find(t => t.value === type);
    return typeConfig ? typeConfig.label : type;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Tournament Information</CardTitle>
          <CardDescription>Upload tournament results from spreadsheet files</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="tournament-name">Tournament Name</Label>
                <Input 
                  id="tournament-name" 
                  type="text" 
                  placeholder="Enter tournament name" 
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  disabled={isUploading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tournament-date">Tournament Date</Label>
                <Input 
                  id="tournament-date" 
                  type="date" 
                  value={tournamentDate}
                  onChange={(e) => setTournamentDate(e.target.value)}
                  disabled={isUploading}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="tournament-type">Tournament Type</Label>
              <Select 
                value={tournamentType} 
                onValueChange={setTournamentType}
                disabled={isUploading}
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
                    Manual tournaments require a "Points" column in your spreadsheet. Points will not be recalculated.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="file-upload">Tournament Results File</Label>
                {tournamentType && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={downloadTemplate}
                    disabled={isUploading}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                )}
              </div>
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  selectedFile ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center space-x-2">
                    <FileUp className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-600">{fileName}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                    <div>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-blue-600 hover:text-blue-500">Upload a file</span>
                        <span className="text-gray-500"> or drag and drop</span>
                      </label>
                      <input
                        id="file-upload"
                        type="file"
                        accept={SUPPORTED_FILE_EXTENSIONS.join(',')}
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </div>
                    <p className="text-xs text-gray-500">Supported formats: {SUPPORTED_FILE_EXTENSIONS.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>

            {isUploading && (
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
                disabled={isUploading || !selectedFile || !tournamentName || !tournamentDate || !tournamentType}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                Generate Preview
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={resetForm}
                disabled={isUploading}
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
                disabled={isUploading}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isUploading ? "Processing..." : "Process Tournament"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowPreview(false)}
                disabled={isUploading}
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
                <li>• Points will be taken directly from your spreadsheet</li>
                <li>• No automatic point calculations will be performed</li>
                <li>• This tournament cannot be recalculated if points systems change</li>
                <li>• Your spreadsheet must include a "Points" column</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualWarning(false)}>
              Cancel
            </Button>
            <Button onClick={() => { setShowManualWarning(false); processUpload(); }}>
              Proceed with Manual Tournament
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
