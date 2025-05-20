import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const { login, isPublicView, togglePublicView } = useAuth();
  
  const handleLogin = () => {
    login();
    navigate("/");
  };
  
  const handlePublicView = () => {
    togglePublicView();
    navigate("/");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-50">
      <div className="w-full max-w-md px-4">
        <Card className="shadow-lg border-t-4 border-t-primary">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Hideout Golf League</CardTitle>
            <CardDescription>
              Access the golf league management system
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-6">
              <Button 
                className="w-full" 
                onClick={handleLogin}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign in as Administrator
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-neutral-500">Or continue as</span>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handlePublicView}
              >
                <Eye className="mr-2 h-4 w-4" />
                Public Viewer
              </Button>
            </div>
          </CardContent>
          
          <CardFooter className="pt-0">
            <p className="text-xs text-center w-full text-neutral-500">
              Public view allows access to Leaderboards, Tournament Results, and Player data only
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}