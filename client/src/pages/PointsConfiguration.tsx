import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Info } from "lucide-react";

// Default points structure for each tournament type
const DEFAULT_POINTS = {
  major: [
    { position: 1, points: 750 },
    { position: 2, points: 400 },
    { position: 3, points: 350 },
    { position: 4, points: 325 },
    { position: 5, points: 300 },
    { position: 6, points: 275 },
    { position: 7, points: 225 },
    { position: 8, points: 200 },
    { position: 9, points: 175 },
    { position: 10, points: 150 },
    { position: 11, points: 130 },
    { position: 12, points: 120 },
    { position: 13, points: 110 },
    { position: 14, points: 90 },
    { position: 15, points: 80 },
    { position: 16, points: 70 },
    { position: 17, points: 65 },
    { position: 18, points: 60 },
    { position: 19, points: 55 },
    { position: 20, points: 50 },
    { position: 21, points: 48 },
    { position: 22, points: 46 },
    { position: 23, points: 44 },
    { position: 24, points: 42 },
    { position: 25, points: 40 },
    { position: 26, points: 38 },
    { position: 27, points: 36 },
    { position: 28, points: 34 },
    { position: 29, points: 32.5 },
    { position: 30, points: 31 },
    { position: 31, points: 29.5 },
    { position: 32, points: 28 },
    { position: 33, points: 26.5 },
    { position: 34, points: 25 },
    { position: 35, points: 24 },
    { position: 36, points: 23 },
    { position: 37, points: 22 },
    { position: 38, points: 21 },
    { position: 39, points: 20.25 },
    { position: 40, points: 19.5 },
    { position: 41, points: 18.75 },
    { position: 42, points: 18 },
    { position: 43, points: 17.25 },
    { position: 44, points: 16.5 },
    { position: 45, points: 15.75 },
    { position: 46, points: 15 },
    { position: 47, points: 14.25 },
    { position: 48, points: 13.5 },
    { position: 49, points: 13 },
    { position: 50, points: 12.5 },
    { position: 51, points: 12 },
    { position: 52, points: 11.5 },
    { position: 53, points: 11 },
    { position: 54, points: 10.5 },
    { position: 55, points: 10 },
    { position: 56, points: 9.5 },
    { position: 57, points: 9 },
    { position: 58, points: 8.5 },
    { position: 59, points: 8 },
    { position: 60, points: 7.75 },
    { position: 61, points: 7.5 },
    { position: 62, points: 7.25 },
    { position: 63, points: 7 },
  ],
  tour: [
    { position: 1, points: 500 },
    { position: 2, points: 300 },
    { position: 3, points: 190 },
    { position: 4, points: 135 },
    { position: 5, points: 110 },
    { position: 6, points: 100 },
    { position: 7, points: 90 },
    { position: 8, points: 85 },
    { position: 9, points: 80 },
    { position: 10, points: 75 },
    { position: 11, points: 70 },
    { position: 12, points: 68 },
    { position: 13, points: 66 },
    { position: 14, points: 64 },
    { position: 15, points: 62 },
    { position: 16, points: 60 },
    { position: 17, points: 58 },
    { position: 18, points: 56 },
    { position: 19, points: 54 },
    { position: 20, points: 52 },
    { position: 21, points: 50 },
    { position: 22, points: 47.5 },
    { position: 23, points: 45 },
    { position: 24, points: 42.5 },
    { position: 25, points: 40 },
    { position: 26, points: 37.5 },
    { position: 27, points: 35 },
    { position: 28, points: 32.5 },
    { position: 29, points: 30 },
    { position: 30, points: 27.5 },
  ],
  league: [
    { position: 1, points: 250 },
    { position: 2, points: 150 },
    { position: 3, points: 95 },
    { position: 4, points: 67.5 },
    { position: 5, points: 55 },
    { position: 6, points: 50 },
    { position: 7, points: 45 },
    { position: 8, points: 42.5 },
    { position: 9, points: 40 },
    { position: 10, points: 37.5 },
    { position: 11, points: 35 },
    { position: 12, points: 34 },
    { position: 13, points: 33 },
    { position: 14, points: 32 },
    { position: 15, points: 31 },
    { position: 16, points: 30 },
    { position: 17, points: 29 },
    { position: 18, points: 28 },
    { position: 19, points: 27 },
    { position: 20, points: 26 },
  ],
  supr: [
    { position: 1, points: 150 },
    { position: 2, points: 90 },
    { position: 3, points: 57 },
    { position: 4, points: 40.5 },
    { position: 5, points: 33 },
    { position: 6, points: 30 },
    { position: 7, points: 27 },
    { position: 8, points: 25.5 },
    { position: 9, points: 24 },
    { position: 10, points: 22.5 },
    { position: 11, points: 21 },
    { position: 12, points: 20.4 },
    { position: 13, points: 19.8 },
    { position: 14, points: 19.2 },
    { position: 15, points: 18.6 },
    { position: 16, points: 18 },
    { position: 17, points: 17.4 },
    { position: 18, points: 16.8 },
    { position: 19, points: 16.2 },
    { position: 20, points: 15.6 },
  ]
};

export default function PointsConfiguration() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"major" | "tour" | "league" | "supr">("tour");
  
  // Fetch current points configuration
  const { data: pointsData, isLoading } = useQuery({
    queryKey: ["/api/points-config"],
    staleTime: 60 * 1000,
    placeholderData: DEFAULT_POINTS,
    refetchOnWindowFocus: false
  });
  
  // State to track edited points
  const [editedPoints, setEditedPoints] = useState(DEFAULT_POINTS);
  
  // Validate API data format
  const validateApiData = (apiData: any) => {
    if (!apiData) return DEFAULT_POINTS;
    
    // Check if the data has the expected structure
    const hasCorrectFormat = 
      apiData.major && Array.isArray(apiData.major) &&
      apiData.tour && Array.isArray(apiData.tour) &&
      apiData.league && Array.isArray(apiData.league) &&
      apiData.supr && Array.isArray(apiData.supr);
    
    if (!hasCorrectFormat) {
      console.error("Invalid points configuration format received from API");
      return DEFAULT_POINTS;
    }
    
    return apiData;
  };
  
  // Update local state when data is loaded
  React.useEffect(() => {
    if (pointsData) {
      const validatedData = validateApiData(pointsData);
      setEditedPoints(validatedData);
    }
  }, [pointsData]);
  
  // Handle point value change
  const handlePointChange = (tournamentType: "major" | "tour" | "league" | "supr", position: number, newValue: string) => {
    const numericValue = parseFloat(newValue);
    if (isNaN(numericValue)) return;
    
    setEditedPoints(prev => ({
      ...prev,
      [tournamentType]: prev[tournamentType].map(item => 
        item.position === position ? { ...item, points: numericValue } : item
      )
    }));
  };
  
  // Save points configuration
  const saveMutation = useMutation({
    mutationFn: async (data: typeof editedPoints) => {
      return apiRequest("PUT", "/api/points-config", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/points-config"] });
      toast({
        title: "Success",
        description: "Points configuration saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save points configuration",
        variant: "destructive",
      });
      console.error("Failed to save points configuration:", error);
    }
  });
  
  const handleSave = () => {
    saveMutation.mutate(editedPoints);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Points Configuration</h1>
          <p className="text-muted-foreground">
            Configure points awarded for each position in different tournament types
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saveMutation.isPending}
          className="flex items-center gap-2"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Configuration
        </Button>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            Points Distribution System
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p>Configure how many points players receive based on their finishing position in each tournament type. 
                  Changes will apply to future tournaments and any recalculation of existing tournaments.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs 
            defaultValue="tour" 
            value={activeTab} 
            onValueChange={(value) => setActiveTab(value as "major" | "tour" | "league" | "supr")}
            className="w-full"
          >
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="major">Major</TabsTrigger>
              <TabsTrigger value="tour">Tour</TabsTrigger>
              <TabsTrigger value="league">League</TabsTrigger>
              <TabsTrigger value="supr">SUPR Club</TabsTrigger>
            </TabsList>
            
            {["major", "tour", "league", "supr"].map(tabValue => (
              <TabsContent key={tabValue} value={tabValue} className="space-y-4">
                <div className="max-h-[600px] overflow-y-auto rounded border">
                  <Table>
                    <TableCaption>
                      Points for {tabValue === "major" ? "Major" : 
                                  tabValue === "tour" ? "Tour" : 
                                  tabValue === "league" ? "League" : 
                                  "SUPR Club"} Tournaments
                    </TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Position</TableHead>
                        <TableHead>Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editedPoints[tabValue as keyof typeof editedPoints].map((item) => (
                        <TableRow key={item.position}>
                          <TableCell className="font-medium">
                            {item.position}<sup>{item.position === 1 ? "st" : item.position === 2 ? "nd" : item.position === 3 ? "rd" : "th"}</sup>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.points}
                              onChange={(e) => handlePointChange(
                                tabValue as "major" | "tour" | "league" | "supr", 
                                item.position, 
                                e.target.value
                              )}
                              className="w-24"
                              step="0.5"
                              min="0"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}