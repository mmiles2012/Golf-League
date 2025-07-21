import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/use-debounce';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Search, UserPlus, Trash2, AlertCircle } from 'lucide-react';
import type { Player } from '@shared/schema';
import { SEARCH_DEBOUNCE_DELAY } from '@/lib/constants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export default function Players() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, SEARCH_DEBOUNCE_DELAY);
  const queryClient = useQueryClient();

  // State for delete confirmation dialog
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // State for auto-delete feature
  const [isAutoDeleting, setIsAutoDeleting] = useState(false);

  // Fetch all players or search results
  const { data: players, isLoading } = useQuery<Player[]>({
    queryKey: ['/api/players', debouncedSearchQuery ? `/search?q=${debouncedSearchQuery}` : ''],
    queryFn: async () => {
      const url = debouncedSearchQuery
        ? `/api/players/search?q=${encodeURIComponent(debouncedSearchQuery)}`
        : '/api/players';

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch players');
      return response.json();
    },
  });

  // Function to check if a player can be deleted (no tournament results)
  const checkPlayerHasResults = async (playerId: number): Promise<boolean> => {
    try {
      const response = await fetch(`/api/player-results?playerId=${playerId}`);
      if (!response.ok) throw new Error('Failed to check player results');
      const results = await response.json();
      return results.length > 0;
    } catch (error) {
      console.error('Error checking player results:', error);
      return true; // Assume they have results if we can't check
    }
  };

  // Delete player function
  const deletePlayer = async () => {
    if (!playerToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/players/${playerToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (errorData.hasResults) {
          setDeleteError('This player has tournament results and cannot be deleted.');
        } else {
          setDeleteError(errorData.message || 'Failed to delete player');
        }

        setIsDeleting(false);
        return;
      }

      // Success - update the player list
      queryClient.invalidateQueries({ queryKey: ['/api/players'] });

      toast({
        title: 'Player deleted',
        description: `${playerToDelete.name} has been removed successfully`,
      });

      // Close dialog
      setPlayerToDelete(null);
    } catch (error) {
      console.error('Error deleting player:', error);
      setDeleteError('An unexpected error occurred. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePlayerClick = (playerId: number) => {
    navigate(`/player/${playerId}`);
  };

  const handleDeleteClick = async (e: React.MouseEvent, player: Player) => {
    e.stopPropagation(); // Prevent navigation to player details

    // Check if player has results before showing delete dialog
    const hasResults = await checkPlayerHasResults(player.id);

    if (hasResults) {
      toast({
        title: 'Cannot delete player',
        description: 'This player has tournament results and cannot be deleted.',
        variant: 'destructive',
      });
      return;
    }

    // Show delete confirmation dialog
    setPlayerToDelete(player);
  };

  // Function to auto-delete inactive players
  const handleAutoDeleteInactive = async () => {
    if (isAutoDeleting) return;

    setIsAutoDeleting(true);

    try {
      const response = await fetch('/api/players/auto-delete-inactive', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to auto-delete inactive players');
      }

      const result = await response.json();

      // Refresh the players list
      queryClient.invalidateQueries({ queryKey: ['/api/players'] });

      if (result.deletedCount.success > 0) {
        toast({
          title: 'Auto-delete complete',
          description: `Successfully deleted ${result.deletedCount.success} inactive players`,
        });
      } else {
        toast({
          title: 'Auto-delete complete',
          description: 'No inactive players found to delete',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error auto-deleting inactive players:', error);
      toast({
        title: 'Error',
        description: 'Failed to auto-delete inactive players',
        variant: 'destructive',
      });
    } finally {
      setIsAutoDeleting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-neutral-800">Players</h1>
          <p className="text-neutral-600">Manage players and view their profiles</p>
        </div>

        <div className="flex gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500" />
            <Input
              type="search"
              placeholder="Search players..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Button
            variant="outline"
            className="whitespace-nowrap"
            onClick={handleAutoDeleteInactive}
            disabled={isAutoDeleting}
          >
            {isAutoDeleting ? (
              <>
                <span className="animate-spin mr-2 h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                Cleaning...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Auto-Delete Inactive
              </>
            )}
          </Button>

          <Button className="whitespace-nowrap" onClick={() => navigate('/players/new')}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Player
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array(5)
                .fill(0)
                .map((_, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {players && players.length > 0 ? (
                players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-neutral-50 transition relative group"
                    onClick={() => handlePlayerClick(player.id)}
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                      {player.name.charAt(0)}
                    </div>
                    <div className="ml-4 flex-grow">
                      <div className="font-medium">{player.name}</div>
                      <div className="text-sm text-neutral-500">
                        {player.defaultHandicap !== null
                          ? `Handicap: ${player.defaultHandicap}`
                          : 'No handicap set'}
                      </div>
                    </div>
                    <button
                      className="p-2 text-neutral-400 hover:text-red-500 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity absolute right-3 top-1/2 -translate-y-1/2"
                      onClick={(e) => handleDeleteClick(e, player)}
                      title="Delete player"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-8">
                  <div className="text-neutral-400">No players found</div>
                  {searchQuery && (
                    <Button variant="link" className="mt-2" onClick={() => setSearchQuery('')}>
                      Clear search
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!playerToDelete} onOpenChange={(open) => !open && setPlayerToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Player</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {playerToDelete?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{deleteError}</p>
            </div>
          )}

          <DialogFooter className="sm:justify-between mt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPlayerToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={deletePlayer}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Deleting...
                </>
              ) : (
                'Delete Player'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
