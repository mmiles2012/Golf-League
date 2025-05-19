import { useState, ChangeEvent, FormEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, FileUp, HelpCircle, FileDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { TOURNAMENT_TYPES } from "@/lib/constants";
import { useQueryClient } from "@tanstack/react-query";

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
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  
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
      setUploadStatus("Processing data...");
      setPreviewData(data.preview);
      
      // Process the tournament data with more detailed logging
      console.log("Preview data:", data.preview);
      
      const processedResults = data.preview.map((row: any, index: number) => {
        // Extract player name with fallback options
        const playerName = row.Player || row.player || row.Name || row.name || "";
        
        // Extract position with fallback options
        const position = parseInt(row.Position || row.position || row.Pos || (index + 1));
        
        // Extract scores with fallback options
        const grossScore = 
          row.Total !== undefined ? parseInt(row.Total) : 
          row["Gross Score"] !== undefined ? parseInt(row["Gross Score"]) : 
          row.grossScore !== undefined ? parseInt(row.grossScore) : null;
        
        const netScore = 
          row["Net Score"] !== undefined ? parseInt(row["Net Score"]) : 
          row.netScore !== undefined ? parseInt(row.netScore) : 
          row.Net !== undefined ? parseInt(row.Net) : null;
        
        const handicap = 
          row["Course Handicap"] !== undefined ? parseFloat(row["Course Handicap"]) :
          row.handicap !== undefined ? parseFloat(row.handicap) : 
          row.Handicap !== undefined ? parseFloat(row.Handicap) : null;
        
        console.log(`Processing row for player: ${playerName}, position: ${position}, gross: ${grossScore}, net: ${netScore}, handicap: ${handicap}`);
        
        return {
          player: playerName,
          position: position,
          grossScore: grossScore,
          netScore: netScore,
          handicap: handicap
        };
      });
      
      const tournamentData = {
        name: tournamentName,
        date: tournamentDate,
        type: tournamentType,
        results: processedResults
      };
      
      console.log("Sending tournament data:", tournamentData);
      
      // Process the tournament
      const processResponse = await apiRequest("POST", "/api/tournaments/process", tournamentData);
      
      if (!processResponse.ok) {
        throw new Error(`Processing failed: ${processResponse.status} ${processResponse.statusText}`);
      }
      
      setUploadProgress(100);
      setUploadStatus("Tournament processed successfully!");
      
      // Show success message
      toast({
        title: "Tournament processed",
        description: "The tournament data has been successfully processed and added to the leaderboard",
        variant: "default"
      });
      
      // Reset form
      setTournamentName("");
      setTournamentDate("");
      setTournamentType("");
      setSelectedFile(null);
      setFileName("");
      setPreviewData(null);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/net"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/gross"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      
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
            
            <div className="pt-4 border-t border-neutral-200">
              <Label className="mb-2 block text-base font-medium">Upload Excel File</Label>
              <p className="text-sm text-neutral-600 mb-4">
                Upload the tournament results Excel file. The file should contain player names, scores, and finishing positions.
              </p>
              
              <div 
                className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-300 border-dashed rounded-md"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="space-y-1 text-center">
                  <FileUp className="mx-auto h-12 w-12 text-neutral-400" />
                  <div className="flex text-sm text-neutral-600 justify-center">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                    >
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        onChange={handleFileChange}
                        accept=".xlsx,.xls"
                        disabled={isUploading}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-neutral-500">Excel files only (XLSX, XLS)</p>
                  
                  {fileName && (
                    <p className="text-sm text-primary mt-2">
                      Selected: {fileName}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Upload Progress */}
              {isUploading && (
                <div className="mt-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-primary">{uploadStatus}</span>
                    <span className="text-sm font-medium text-primary">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <Button 
                  type="submit" 
                  className="inline-flex items-center" 
                  disabled={isUploading || !selectedFile}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload and Process
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* File Format Help */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Excel File Format Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <div className="bg-neutral-100 px-4 py-2 border-b">
              <p className="font-medium">Expected Format</p>
            </div>
            <div className="p-4">
              <p className="text-sm text-neutral-600 mb-3">Your Excel file should have the following columns:</p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead>
                    <tr className="bg-neutral-50">
                      <th className="px-4 py-2 text-left text-xs font-medium text-neutral-700">Column</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-neutral-700">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-neutral-700">Example</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    <tr>
                      <td className="px-4 py-2 text-sm">Player</td>
                      <td className="px-4 py-2 text-sm">Full name of the golfer</td>
                      <td className="px-4 py-2 text-sm">Michael Johnson</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Position</td>
                      <td className="px-4 py-2 text-sm">Finishing position in the tournament</td>
                      <td className="px-4 py-2 text-sm">1</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Scoring</td>
                      <td className="px-4 py-2 text-sm">Net score or "StrokeNet"</td>
                      <td className="px-4 py-2 text-sm">68 or "StrokeNet"</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Total</td>
                      <td className="px-4 py-2 text-sm">Raw stroke total</td>
                      <td className="px-4 py-2 text-sm">76</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm">Course Handicap</td>
                      <td className="px-4 py-2 text-sm">Player's handicap for the round</td>
                      <td className="px-4 py-2 text-sm">8</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-neutral-500">
                Note: For StrokeNet scoring, the system will calculate the gross score by adding the Course Handicap to the Total.
              </p>
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
            <Button variant="outline" className="inline-flex items-center">
              <FileDown className="mr-2 h-4 w-4" />
              Download Sample File
            </Button>
            <Button variant="outline" className="inline-flex items-center">
              <HelpCircle className="mr-2 h-4 w-4" />
              View Help Guide
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
