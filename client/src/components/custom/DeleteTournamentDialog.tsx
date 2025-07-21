import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TriangleAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';

interface DeleteTournamentDialogProps {
  tournament: {
    id: number;
    name: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DeleteTournamentDialog({
  tournament,
  isOpen,
  onClose,
}: DeleteTournamentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [confirmation, setConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!tournament) return;

    setIsDeleting(true);

    try {
      console.log(`Deleting tournament with ID: ${tournament.id}`);

      // Use fetch directly for better control over the request
      const response = await fetch(`/api/tournaments/${tournament.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete tournament');
      }

      toast({
        title: 'Tournament deleted',
        description: `${tournament.name} has been deleted successfully`,
        variant: 'default',
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard/net'] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard/gross'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });

      onClose();
    } catch (error) {
      console.error('Error deleting tournament:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete tournament',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setConfirmation('');
    }
  };

  const isConfirmationValid = confirmation === 'DELETE';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the tournament and
            recalculate all season points.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <TriangleAlert className="h-6 w-6 text-red-600" />
          </div>

          <h3 className="text-lg font-medium leading-6 text-center text-neutral-900 mb-1">
            Delete Tournament
          </h3>

          <div className="mt-2 px-7 py-3">
            <p className="text-sm text-neutral-600 text-center">
              You are about to delete <span className="font-semibold">{tournament?.name}</span>.
              This action cannot be undone and will recalculate all season points.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="delete-confirmation">Type "DELETE" to confirm:</Label>
          <Input
            id="delete-confirmation"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="Type DELETE..."
            className="mt-1"
          />
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmationValid || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Tournament'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
