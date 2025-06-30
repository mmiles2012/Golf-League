import { useState, ChangeEvent, FormEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileUp, Eye, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { TOURNAMENT_TYPES } from "@/lib/constants";
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

export default function TournamentUploaderNew() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tournamentName, setTournamentName] = useState("");
  const [tournamentDate, setTournamentDate] = useState("");
  const [tournamentType, setTournamentType] = useState("");
  const [scoringType, setScoringType] = useState("StrokeNet");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [tournamentPreview, setTournamentPreview] = useState<TournamentPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<Array<{ type: string; message: string }>>([]);

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
      // Check if the file is an Excel file
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an Excel file (.xlsx or .xls)",
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
      // Check if the file is an Excel file
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an Excel file (.xlsx or .xls)",
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

  // Generate tournament preview with points calculations
  const generateTournamentPreview = async (uploadedData: any[]) => {
    try {
      setUploadStatus("Generating tournament preview with points calculations...");
      
      // Process the uploaded data
      const processedResults = uploadedData.map((row: any, index: number) => {
        // Extract player name with fallback options
        const playerName = row.Player || row["Player Name"] || row.player || row.Name || row.name || "";
        
        // Extract position with fallback options
        const position = parseInt(String(row.Position || row.position || row.Pos || (index + 1)));
        
        // Handle scores based on scoring type
        let grossScore, netScore, handicap;
        
        if ((row.Scoring === "StrokeNet" || row.Scoring === "Stroke") && row.Total !== undefined) {
          const isStrokeNet = row.Scoring === "StrokeNet";
          
          // Handle handicap calculations
          let handicapValue = 0;
          if (row["Playing Handicap"] !== undefined) {
            const handicapStr = String(row["Playing Handicap"]);
            if (handicapStr.includes('+')) {
              handicapValue = parseFloat(handicapStr.replace('+', ''));
            } else {
              handicapValue = Math.abs(parseFloat(handicapStr));
            }
          } else if (row["Course Handicap"] !== undefined) {
            const handicapStr = String(row["Course Handicap"]);
            if (handicapStr.includes('+')) {
              handicapValue = parseFloat(handicapStr.replace('+', ''));
            } else {
              handicapValue = Math.abs(parseFloat(handicapStr));
            }
          }
          
          if (isStrokeNet) {
            netScore = parseFloat(String(row.Total));
            grossScore = netScore + handicapValue;
            handicap = handicapValue;
          } else {
            grossScore = parseFloat(String(row.Total));
            netScore = grossScore - handicapValue;
            handicap = handicapValue;
          }
        } else {
          // Handle other scoring formats
          grossScore = row["Gross Score"] ? parseFloat(String(row["Gross Score"])) : null;
          netScore = row["Net Score"] ? parseFloat(String(row["Net Score"])) : null;
          handicap = row["Handicap"] || row["Course Handicap"] ? parseFloat(String(row["Handicap"] || row["Course Handicap"])) : null;
        }
        
        return {
          player: playerName,
          position: position,
          grossScore: grossScore,
          netScore: netScore,
          handicap: handicap
        };
      });

      // Call the preview API
      const previewResponse = await apiRequest("POST", "/api/tournaments/preview", {
        name: tournamentName,
        date: tournamentDate,
        type: tournamentType,
        scoringType: scoringType,
        results: processedResults
      });

      if (previewResponse) {
        setTournamentPreview(previewResponse as TournamentPreview);
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

    setIsUploading(true);
    setUploadProgress(10);
    setUploadStatus("Uploading file...");
    setUploadErrors([]);

    try {
      // Upload the file
      const formData = new FormData();
      formData.append("file", selectedFile);

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
      setUploadStatus("Generating preview...");

      // Generate tournament preview with points calculations
      await generateTournamentPreview(data.preview);

    } catch (error) {
      console.error("Upload error:", error);

      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Process the tournament after user confirms the preview
  const processTournament = async () => {
    if (!tournamentPreview) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus("Processing tournament...");

    try {
      // Process the tournament data with the results from preview
      const processResponse = await apiRequest("POST", "/api/tournaments/process", {
        name: tournamentPreview.tournament.name,
        date: tournamentPreview.tournament.date,
        type: tournamentPreview.tournament.type,
        scoringType: tournamentPreview.tournament.scoringType,
        results: tournamentPreview.results.map(r => ({
          player: r.playerName,
          position: r.position,
          grossScore: r.grossScore,
          netScore: r.netScore,
          handicap: r.handicap
        }))
      });

      if (processResponse) {
        setUploadProgress(100);
        setUploadStatus("Tournament processed successfully!");
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
        queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/net"] });
        queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/gross"] });
        
        toast({
          title: "Success",
          description: "Tournament has been processed and added to the leaderboards!",
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

  const getTournamentTypeLabel = (type: string) => {
    const typeConfig = TOURNAMENT_TYPES.find(t => t.value === type);
    return typeConfig ? typeConfig.label : type;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Tournament Information</CardTitle>
          <CardDescription>Enter the tournament details before uploading the scores</CardDescription>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-neutral-500 mt-1">Points will be assigned based on the tournament type</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="scoring-type">Scoring Type</Label>
                <Select 
                  value={scoringType} 
                  onValueChange={setScoringType}
                  disabled={isUploading}
                >
                  <SelectTrigger id="scoring-type">
                    <SelectValue placeholder="Select scoring type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="StrokeNet">Stroke Net</SelectItem>
                    <SelectItem value="Stroke">Stroke Play</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="file-upload">Tournament Results File</Label>
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
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </div>
                    <p className="text-xs text-gray-500">Excel files only (.xlsx, .xls)</p>
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
              Review the tournament details and points calculations before processing
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
                {tournamentPreview.summary.newPlayers > 0 && (
                  <p className="text-sm text-blue-600">{tournamentPreview.summary.newPlayers} new players</p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Points</p>
                <p className="text-lg font-semibold">{tournamentPreview.summary.totalPoints.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Ties Detected</p>
                <p className="text-lg font-semibold">
                  {tournamentPreview.summary.tiesDetected ? (
                    <Badge variant="secondary">Yes</Badge>
                  ) : (
                    <Badge variant="outline">No</Badge>
                  )}
                </p>
              </div>
            </div>

            {/* Results Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Position</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Gross Score</TableHead>
                    <TableHead>Net Score</TableHead>
                    <TableHead>Handicap</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tournamentPreview.results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge variant={result.tiedPosition ? "secondary" : "outline"}>
                          {result.displayPosition}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{result.playerName}</TableCell>
                      <TableCell>{result.grossScore?.toFixed(1) || '-'}</TableCell>
                      <TableCell>{result.netScore?.toFixed(1) || '-'}</TableCell>
                      <TableCell>{result.handicap?.toFixed(1) || '-'}</TableCell>
                      <TableCell className="font-semibold">{result.points.toFixed(1)}</TableCell>
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
          </CardContent>
          <CardFooter className="flex space-x-2">
            <Button 
              onClick={processTournament}
              disabled={isUploading}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm & Process Tournament
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowPreview(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
          </CardFooter>
        </Card>
      )}
    </>
  );
}