import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Upload } from "lucide-react";

// Define the app settings interface
interface AppSettings {
  appName: string;
  pageTitle: string;
  scoringType: "net" | "gross" | "both";
  sidebarColor: string;
  logoUrl: string;
}

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  appName: "Hideout Golf League",
  pageTitle: "Leaderboards",
  scoringType: "both",
  sidebarColor: "#0f172a", // Default tailwind blue-900
  logoUrl: "images/hideout-logo.png"
};

export default function SetupPage() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Fetch current settings
  const { data: currentSettings, isLoading, isError } = useQuery<AppSettings>({
    queryKey: ["/api/settings"]
  });
  
  // If there's an error fetching settings, use defaults
  React.useEffect(() => {
    if (isError) {
      setSettings(DEFAULT_SETTINGS);
    }
  }, [isError]);

  // Update state when settings are loaded
  useEffect(() => {
    if (currentSettings) {
      // Type assertion to ensure it's treated as AppSettings
      const typedSettings = currentSettings as AppSettings;
      setSettings(typedSettings);
      setLogoPreview(typedSettings.logoUrl);
    }
  }, [currentSettings]);

  // Handle logo file selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form field changes
  const handleChange = (field: keyof AppSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // First, handle logo upload if there's a new logo
      let logoUrl = settings.logoUrl;
      
      if (logoFile) {
        const formData = new FormData();
        formData.append("logo", logoFile);
        
        // Upload logo
        const uploadResponse = await fetch("/api/upload/logo", {
          method: "POST",
          body: formData
        });
        
        if (!uploadResponse.ok) {
          throw new Error("Failed to upload logo");
        }
        
        const uploadData = await uploadResponse.json();
        logoUrl = uploadData.url;
      }
      
      // Save settings with updated logo URL
      return apiRequest("PUT", "/api/settings", {
        ...settings,
        logoUrl
      });
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your application settings have been updated",
        variant: "default"
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      
      // Reload the page to apply new settings
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    },
    onError: (error) => {
      toast({
        title: "Error saving settings",
        description: "There was a problem saving your settings",
        variant: "destructive"
      });
      console.error("Settings save error:", error);
    }
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      await saveMutation.mutateAsync();
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Application Setup</h1>
          <p className="text-neutral-600">Customize your golf league application</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Branding Card */}
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Customize the application name and logo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="app-name">Application Name</Label>
                <Input
                  id="app-name"
                  value={settings.appName}
                  onChange={(e) => handleChange("appName", e.target.value)}
                  placeholder="Enter application name"
                  disabled={isSaving}
                />
                <p className="text-sm text-neutral-500">
                  This will appear in the sidebar header
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="page-title">Main Page Title</Label>
                <Input
                  id="page-title"
                  value={settings.pageTitle}
                  onChange={(e) => handleChange("pageTitle", e.target.value)}
                  placeholder="Enter page title"
                  disabled={isSaving}
                />
                <p className="text-sm text-neutral-500">
                  This will appear as the title on the main landing page
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo-upload">Logo Image</Label>
                <div className="flex items-center gap-4">
                  {logoPreview && (
                    <div className="h-16 w-16 bg-neutral-100 rounded-md flex items-center justify-center overflow-hidden">
                      <img 
                        src={logoPreview} 
                        alt="Logo preview" 
                        className="h-12 w-12 object-contain"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <Label 
                      htmlFor="logo-upload" 
                      className="cursor-pointer flex items-center gap-2 border border-input bg-transparent px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground w-full"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Upload logo</span>
                      <Input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoChange}
                        disabled={isSaving}
                      />
                    </Label>
                  </div>
                </div>
                <p className="text-sm text-neutral-500">
                  Recommended size: 64x64 pixels
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Display Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle>Display Settings</CardTitle>
              <CardDescription>Customize the appearance and scoring preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Scoring Type</Label>
                <RadioGroup
                  value={settings.scoringType}
                  onValueChange={(value) => handleChange("scoringType", value)}
                  disabled={isSaving}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="net" id="scoring-net" />
                    <Label htmlFor="scoring-net">Net Scoring Only</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="gross" id="scoring-gross" />
                    <Label htmlFor="scoring-gross">Gross Scoring Only</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="scoring-both" />
                    <Label htmlFor="scoring-both">Both Net and Gross Scoring</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sidebar-color">Sidebar Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="sidebar-color"
                    type="color"
                    value={settings.sidebarColor}
                    onChange={(e) => handleChange("sidebarColor", e.target.value)}
                    className="w-16 h-10 p-1"
                    disabled={isSaving}
                  />
                  <Input
                    type="text"
                    value={settings.sidebarColor}
                    onChange={(e) => handleChange("sidebarColor", e.target.value)}
                    className="flex-1"
                    placeholder="#000000"
                    disabled={isSaving}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end">
          <Button 
            type="submit"
            disabled={isSaving}
            className="min-w-[120px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}