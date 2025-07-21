import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [, navigate] = useLocation();
  const { login, isPublicView, togglePublicView } = useAuth();
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Admin credentials (in a real app, this would be authenticated against a backend)
  const ADMIN_USERNAME = 'admin';
  const ADMIN_PASSWORD = 'hideout2025';

  const handleLogin = () => {
    setIsLoading(true);

    // Simple credential check
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      login();
      navigate('/');
      toast({
        title: 'Logged in successfully',
        description: 'You now have administrator access',
        variant: 'default',
      });
    } else {
      toast({
        title: 'Invalid credentials',
        description: 'Please check your username and password',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handlePublicView = () => {
    togglePublicView();
    navigate('/');
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-50">
      <div className="w-full max-w-md px-4">
        <Card className="shadow-lg border-t-4 border-t-primary">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Hideout Golf League</CardTitle>
            <CardDescription>Access the golf league management system</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter admin username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleLogin();
                      }}
                    />
                    <button
                      type="button"
                      onClick={toggleShowPassword}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    className="w-full"
                    onClick={handleLogin}
                    disabled={isLoading || !username || !password}
                  >
                    {isLoading ? (
                      <span className="flex items-center">
                        <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Signing in...
                      </span>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        Sign in as Administrator
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-center mt-2 text-neutral-500">
                    Default credentials: admin / hideout2025
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-neutral-500">Or continue as</span>
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={handlePublicView}>
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
