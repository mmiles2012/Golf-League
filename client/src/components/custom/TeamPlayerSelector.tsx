import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TeamPlayerSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  teamPlayers: Array<{ original: string; options: string[] }>;
  onSelectionComplete: (selections: Record<string, string>) => void;
}

export default function TeamPlayerSelector({
  isOpen,
  onClose,
  teamPlayers,
  onSelectionComplete,
}: TeamPlayerSelectorProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});

  // Initialize selections with the first player for each team
  useEffect(() => {
    const initialSelections: Record<string, string> = {};
    teamPlayers.forEach((team) => {
      initialSelections[team.original] = team.options[0];
    });
    setSelections(initialSelections);
  }, [teamPlayers]);

  const handleSelectionChange = (teamName: string, selectedPlayer: string) => {
    setSelections((prev) => ({
      ...prev,
      [teamName]: selectedPlayer,
    }));
  };

  const handleConfirm = () => {
    onSelectionComplete(selections);
    onClose();
  };

  const allSelected = teamPlayers.every((team) => selections[team.original]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Players</DialogTitle>
          <DialogDescription>
            Some entries are teams with multiple players. Select which player should receive the
            points.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-96 pr-4">
          <div className="space-y-6">
            {teamPlayers.map((team) => (
              <div key={team.original} className="space-y-2">
                <div className="font-medium text-sm">Team: {team.original}</div>
                <RadioGroup
                  value={selections[team.original] || ''}
                  onValueChange={(value) => handleSelectionChange(team.original, value)}
                  className="space-y-1"
                >
                  {team.options.map((player) => (
                    <div key={player} className="flex items-center space-x-2">
                      <RadioGroupItem value={player} id={`${team.original}-${player}`} />
                      <Label htmlFor={`${team.original}-${player}`}>{player}</Label>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id={`${team.original}-both`} />
                    <Label htmlFor={`${team.original}-both`}>Both players</Label>
                  </div>
                </RadioGroup>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!allSelected}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
