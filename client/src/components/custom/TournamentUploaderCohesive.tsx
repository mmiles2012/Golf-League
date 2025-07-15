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
import { Upload, FileUp, Eye, CheckCircle, AlertCircle, Download, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { TOURNAMENT_TYPES, SCORING_MODES, SCORING_TYPES, SUPPORTED_FILE_EXTENSIONS } from "@/lib/constants";
import { downloadSampleSpreadsheet, getRequiredFields, getFieldDescriptions } from "@/lib/sample-spreadsheet-generator";
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

export default function TournamentUploaderCohesive() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tournamentName, setTournamentName] = useState("");
  const [tournamentDate, setTournamentDate] = useState("");
  const [tournamentType, setTournamentType] = useState("");
  const [scoringMode, setScoringMode] = useState<'calculated' | 'manual'>('calculated');
  const [scoringType, setScoringType] = useState<'net' | 'gross' | 'both'>('both');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [tournamentPreview, setTournamentPreview] = useState<TournamentPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<Array<{ type: string; message: string }>>([]);
  const [showManualWarning, setShowManualWarning] = useState(false);

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

  // Handle form submission and generate preview
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!tournamentName || !tournamentDate || !tournamentType || !selectedFile) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields and select a file",
        variant: "destructive"
      });
      return;
    }

    // Show warning for manual tournaments
    if (scoringMode === 'manual') {
      setShowManualWarning(true);
      return;
    }

    await processUpload();
  };

  const processUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(25);
    setUploadStatus("Reading and parsing file...");
    setUploadErrors([]);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", tournamentName);
      formData.append("date", tournamentDate);
      formData.append("type", tournamentType);
      formData.append("scoringMode", scoringMode);
      formData.append("scoringType", scoringType);

      setUploadProgress(50);
      setUploadStatus("Calculating points and validating data...");

      const endpoint = scoringMode === 'manual' ? "/api/tournaments/manual-preview" : "/api/tournaments/preview";
      const response = await apiRequest("POST", endpoint, formData);

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
      console.error("Upload error:", error);
      setUploadErrors([{
        type: 'upload',
        message: 'Failed to upload and process file. Please check your file format and try again.'
      }]);
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
      const formData = new FormData();
      formData.append("file", selectedFile!);
      formData.append("name", tournamentPreview.tournament.name);
      formData.append("date", tournamentPreview.tournament.date);
      formData.append("type", tournamentPreview.tournament.type);
      formData.append("scoringMode", scoringMode);
      formData.append("scoringType", scoringType);

      const endpoint = scoringMode === 'manual' ? "/api/tournaments/manual-entry" : "/api/tournaments/process";
      
      const processResponse = await apiRequest("POST", endpoint, formData);

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
      setIsUploading(false);
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
                Upload Tournament Results
                <Badge variant="secondary" className="bg-green-100 text-green-800">Cohesive v3.0</Badge>
              </CardTitle>
              <CardDescription>
                Import tournament results from Excel or CSV files with flexible header parsing and automatic point calculation
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* Tournament Type Selection */}
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
                disabled={isUploading}
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
                  disabled={isUploading}
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
                  Determines what score fields are required in your spreadsheet
                </p>
              </div>
            )}

            {/* Required Fields Display */}
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

            {/* Sample Download */}
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

            {/* File Upload */}
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
                disabled={isUploading}
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

            {isUploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-sm text-gray-600">{uploadStatus}</p>
              </div>
            )}

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

            <div className="flex space-x-2">
              <Button 
                type="submit" 
                disabled={isUploading || !tournamentName || !tournamentDate || !tournamentType || !selectedFile}
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
              Review the tournament details and {scoringMode === 'manual' ? 'manual points' : 'calculated points'} before processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tournament Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-500">Tournament</p>
                <p className="text-lg font-semibold">{tournamentPreview.tournament.name}</p>
                <p className="text-sm text-gray-600">{getTournamentTypeLabel(tournamentPreview.tournament.type)}</p>
                {scoringMode === 'manual' && <Badge variant="secondary">Manual</Badge>}
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
                disabled={isUploading}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
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
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span>Manual Tournament Confirmation</span>
            </DialogTitle>
            <DialogDescription>
              You are uploading a manual tournament where points are directly assigned rather than calculated from positions.
              These points will not be subject to automatic recalculation.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualWarning(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setShowManualWarning(false);
              processUpload();
            }}>
              Continue with Manual Tournament
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
