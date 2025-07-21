import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { User, Edit3, Trophy, TrendingUp, Calendar, Users, Star, UserX } from 'lucide-react';
import { Link } from 'wouter';
import type { PlayerWithHistory } from '@shared/schema';

export default function PlayerDashboard() {
  const { user, player, linkedPlayerId, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    homeClub: '',
    friendsList: [] as string[],
  });
  const [selectedScoreType, setSelectedScoreType] = useState<'net' | 'gross'>('net');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Logging in to access your dashboard...',
        variant: 'default',
      });
      setTimeout(() => {
        window.location.href = '/api/login';
      }, 1000);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  // Get all players for friends selection
  const { data: allPlayers = [] } = useQuery({
    queryKey: ['/api/players'],
    enabled: isAuthenticated,
  });

  // Get player history if linked to a player
  const {
    data: playerHistory,
    isLoading: historyLoading,
    error: historyError,
  } = useQuery({
    queryKey: [`/api/players/${linkedPlayerId}/history`],
    enabled: !!linkedPlayerId,
  });

  // Get friends leaderboard
  const { data: friendsLeaderboard = [] } = useQuery({
    queryKey: ['/api/auth/friends-leaderboard', selectedScoreType],
    enabled: isAuthenticated && user?.friendsList && user.friendsList.length > 0,
  });

  // Get home club options
  const { data: homeClubOptions = [] } = useQuery<string[]>({
    queryKey: ['/api/home-club-options'],
    enabled: isAuthenticated,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Frontend: Sending profile update request:', data);
      return await apiRequest('PUT', '/api/auth/profile', data);
    },
    onSuccess: (data) => {
      console.log('Frontend: Profile update successful:', data);
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully.',
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({
        queryKey: ['/api/auth/friends-leaderboard', selectedScoreType],
      });
    },
    onError: (error: Error) => {
      console.error('Frontend: Profile update error:', error);
      console.error('Frontend: Error message:', error.message);
      if (isUnauthorizedError(error)) {
        toast({
          title: 'Session Expired',
          description: 'Please log in again to continue.',
          variant: 'destructive',
        });
        setTimeout(() => {
          window.location.href = '/api/login';
        }, 1000);
        return;
      }
      toast({
        title: 'Update Failed',
        description: `Failed to update profile: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Link player mutation
  const linkPlayerMutation = useMutation({
    mutationFn: async (playerId: number) => {
      return await apiRequest(`/api/auth/link-player/${playerId}`, 'POST');
    },
    onSuccess: () => {
      toast({
        title: 'Player Linked',
        description: 'Your account has been linked to your player profile.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: 'Session Expired',
          description: 'Please log in again to continue.',
          variant: 'destructive',
        });
        setTimeout(() => {
          window.location.href = '/api/login';
        }, 1000);
        return;
      }
      toast({
        title: 'Link Failed',
        description: 'Failed to link player profile. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Unlink player mutation
  const unlinkPlayerMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/auth/unlink-player', 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: 'Player Unlinked',
        description: 'Your account has been unlinked from the player profile.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: 'Session Expired',
          description: 'Please log in again to continue.',
          variant: 'destructive',
        });
        setTimeout(() => {
          window.location.href = '/api/login';
        }, 1000);
        return;
      }
      toast({
        title: 'Unlink Failed',
        description: 'Failed to unlink player profile. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Initialize edit form when user data is available
  useEffect(() => {
    if (user) {
      setEditForm({
        displayName: user.displayName || '',
        homeClub: user.homeClub || '',
        friendsList: user.friendsList || [],
      });
    }
  }, [user]);

  const handleEditSave = () => {
    if (!editForm.displayName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Display name is required.',
        variant: 'destructive',
      });
      return;
    }
    updateProfileMutation.mutate(editForm);
  };

  const handleFriendsChange = (playerName: string, checked: boolean) => {
    setEditForm((prev) => ({
      ...prev,
      friendsList: checked
        ? [...prev.friendsList, playerName]
        : prev.friendsList.filter((name) => name !== playerName),
    }));
  };

  const getTop8Events = (tournaments: any[]) => {
    return tournaments.sort((a, b) => b.points - a.points).slice(0, 8);
  };

  const getDroppedEvents = (tournaments: any[]) => {
    return tournaments.sort((a, b) => b.points - a.points).slice(8);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login via useEffect
  }

  const top8Events = playerHistory?.tournaments ? getTop8Events(playerHistory.tournaments) : [];
  const droppedEvents = playerHistory?.tournaments
    ? getDroppedEvents(playerHistory.tournaments)
    : [];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Player Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.displayName || user?.firstName || 'Player'}!
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge
            variant={
              user?.role === 'super_admin'
                ? 'default'
                : user?.role === 'admin'
                  ? 'secondary'
                  : 'outline'
            }
          >
            {user?.role === 'super_admin'
              ? 'Super Admin'
              : user?.role === 'admin'
                ? 'Admin'
                : 'Player'}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isEditing ? (
              <>
                <div>
                  <Label className="text-sm font-medium">Display Name</Label>
                  <p className="text-sm text-muted-foreground">{user?.displayName || 'Not set'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-muted-foreground">{user?.email || 'Not set'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Home Club</Label>
                  <p className="text-sm text-muted-foreground">{user?.homeClub || 'Not set'}</p>
                </div>
                <Button onClick={() => setIsEditing(true)} size="sm">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="displayName">Display Name *</Label>
                  <Input
                    id="displayName"
                    value={editForm.displayName}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, displayName: e.target.value }))
                    }
                    placeholder="Enter your display name"
                  />
                </div>
                <div>
                  <Label htmlFor="homeClub">Home Club</Label>
                  <Select
                    value={editForm.homeClub}
                    onValueChange={(value) => setEditForm((prev) => ({ ...prev, homeClub: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your home club" />
                    </SelectTrigger>
                    <SelectContent>
                      {homeClubOptions.map((club) => (
                        <SelectItem key={club} value={club}>
                          {club}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={handleEditSave}
                    size="sm"
                    disabled={updateProfileMutation.isPending}
                  >
                    Save
                  </Button>
                  <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Player Link Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="h-5 w-5 mr-2" />
              Tournament Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {player ? (
              <>
                <div>
                  <Label className="text-sm font-medium">Linked Player</Label>
                  <p className="text-sm text-muted-foreground">{player.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Default Handicap</Label>
                  <p className="text-sm text-muted-foreground">
                    {player.defaultHandicap ?? 'Not set'}
                  </p>
                </div>
                <Button
                  onClick={() => unlinkPlayerMutation.mutate()}
                  variant="outline"
                  size="sm"
                  disabled={unlinkPlayerMutation.isPending}
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Unlink Player
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Link your account to your tournament player profile to see your statistics and
                  history.
                </p>
                <Select onValueChange={(value) => linkPlayerMutation.mutate(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your player profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {allPlayers.map((p: any) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </CardContent>
        </Card>

        {/* Performance Summary */}
        {playerHistory && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Overall Rank</span>
                <Badge variant="outline">#{playerHistory.rank}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Total Events</span>
                <span className="text-sm font-medium">{playerHistory.totalEvents}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Overall Points</span>
                <span className="text-sm font-medium">{playerHistory.top8TotalPoints || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Avg Net Score</span>
                <span className="text-sm font-medium">
                  {playerHistory.averageNetScore?.toFixed(1) || 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Friends Selection */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Friends List
            </CardTitle>
            <CardDescription>Select players to include in your friends leaderboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
              {allPlayers.map((p: any) => (
                <div key={p.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`friend-${p.id}`}
                    checked={editForm.friendsList.includes(p.name)}
                    onCheckedChange={(checked) => handleFriendsChange(p.name, checked as boolean)}
                  />
                  <Label htmlFor={`friend-${p.id}`} className="text-sm">
                    {p.name}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Friends Leaderboard */}
      {!isEditing && user?.friendsList && user.friendsList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Friends Leaderboard
              </div>
              <Select
                value={selectedScoreType}
                onValueChange={(value: 'net' | 'gross') => setSelectedScoreType(value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="net">Net</SelectItem>
                  <SelectItem value="gross">Gross</SelectItem>
                </SelectContent>
              </Select>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {friendsLeaderboard.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Events</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {friendsLeaderboard.map((player: PlayerWithHistory, index: number) => (
                    <TableRow key={player.player.id}>
                      <TableCell>#{index + 1}</TableCell>
                      <TableCell>
                        <Link href={`/player/${player.player.id}`} className="hover:underline">
                          {player.player.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {selectedScoreType === 'net'
                          ? player.top8TotalPoints || 0
                          : player.grossTop8TotalPoints || 0}
                      </TableCell>
                      <TableCell>{player.totalEvents}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No friends found in leaderboard data
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tournament History */}
      {playerHistory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Tournament History
            </CardTitle>
            <CardDescription>Your tournament results sorted by performance</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Top 8 Events */}
            {top8Events.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center mb-3">
                  <Star className="h-4 w-4 mr-2 text-yellow-500" />
                  <h3 className="font-semibold">Top 8 Events (Counting toward Overall Points)</h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tournament</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Net Score</TableHead>
                      <TableHead>Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {top8Events.map((tournament: any) => (
                      <TableRow key={tournament.id} className="bg-yellow-50">
                        <TableCell>
                          <div>
                            <div className="font-medium">{tournament.tournamentName}</div>
                            <Badge variant="outline" className="text-xs">
                              {tournament.tournamentType.toUpperCase()}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(tournament.tournamentDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={tournament.position <= 3 ? 'default' : 'secondary'}>
                            {tournament.position <= 10 && tournament.position > 1
                              ? `T${tournament.position}`
                              : tournament.position}
                          </Badge>
                        </TableCell>
                        <TableCell>{tournament.netScore ?? 'N/A'}</TableCell>
                        <TableCell className="font-medium">{tournament.points}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Dropped Events */}
            {droppedEvents.length > 0 && (
              <div>
                <Separator className="my-4" />
                <div className="flex items-center mb-3">
                  <h3 className="font-semibold text-muted-foreground">
                    Additional Events (Not counting toward Overall Points)
                  </h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tournament</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Net Score</TableHead>
                      <TableHead>Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {droppedEvents.map((tournament: any) => (
                      <TableRow key={tournament.id} className="opacity-60">
                        <TableCell>
                          <div>
                            <div className="font-medium">{tournament.tournamentName}</div>
                            <Badge variant="outline" className="text-xs">
                              {tournament.tournamentType.toUpperCase()}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(tournament.tournamentDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {tournament.position <= 10 && tournament.position > 1
                              ? `T${tournament.position}`
                              : tournament.position}
                          </Badge>
                        </TableCell>
                        <TableCell>{tournament.netScore ?? 'N/A'}</TableCell>
                        <TableCell>{tournament.points}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {playerHistory?.tournaments && playerHistory.tournaments.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                No tournament history available
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
