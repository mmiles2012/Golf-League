import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

interface PlayerSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (playerId: number, playerName: string) => void;
  onNotFound: (playerName: string) => void;
  disabled?: boolean;
}

interface Player {
  id: number;
  name: string;
}

export default function PlayerSearchInput({
  value,
  onChange,
  onSelect,
  onNotFound,
  disabled = false,
}: PlayerSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebounce(value, 300);

  useEffect(() => {
    // Add click outside handler
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Do search when debounced value changes
    const searchPlayers = async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) {
        setPlayers([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch(
          `/api/players/search?q=${encodeURIComponent(debouncedSearch)}`,
        );

        if (!response.ok) {
          throw new Error('Failed to search players');
        }

        const data = await response.json();
        setPlayers(data);
        setIsOpen(data.length > 0);
      } catch (error) {
        console.error('Error searching players:', error);
        setPlayers([]);
      } finally {
        setIsLoading(false);
      }
    };

    searchPlayers();
  }, [debouncedSearch]);

  const handleSelect = (player: Player) => {
    onChange(player.name);
    onSelect(player.id, player.name);
    setIsOpen(false);
  };

  const handleBlur = () => {
    // Use setTimeout to allow click events on dropdown items to fire first
    setTimeout(() => {
      // If we have a value but no matching players, trigger onNotFound
      if (value && value.trim() !== '' && players.length === 0) {
        onNotFound(value);
      }
    }, 200);
  };

  return (
    <div className="relative" ref={autocompleteRef}>
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => players.length > 0 && setIsOpen(true)}
        onBlur={handleBlur}
        placeholder="Enter player name"
        disabled={disabled}
        className="w-full"
      />

      {isLoading && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
        </div>
      )}

      {isOpen && players.length > 0 && (
        <div className="absolute z-10 w-full bg-white shadow-lg rounded-md border border-neutral-200 mt-1">
          <ul className="max-h-60 overflow-auto py-1 text-sm">
            {players.map((player) => (
              <li
                key={player.id}
                className="px-4 py-2 hover:bg-neutral-100 cursor-pointer"
                onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                onClick={() => handleSelect(player)}
              >
                {player.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
