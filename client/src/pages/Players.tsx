import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, UserPlus } from "lucide-react";
import type { Player } from "@shared/schema";
import { SEARCH_DEBOUNCE_DELAY } from "@/lib/constants";

export default function Players() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, SEARCH_DEBOUNCE_DELAY);
  
  // Fetch all players or search results
  const { data: players, isLoading } = useQuery<Player[]>({
    queryKey: ["/api/players", debouncedSearchQuery ? `/search?q=${debouncedSearchQuery}` : ""],
    queryFn: async () => {
      const url = debouncedSearchQuery
        ? `/api/players/search?q=${encodeURIComponent(debouncedSearchQuery)}`
        : "/api/players";
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch players");
      return response.json();
    },
  });
  
  const handlePlayerClick = (playerId: number) => {
    navigate(`/player/${playerId}`);
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
          
          <Button className="whitespace-nowrap">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Player
          </Button>
        </div>
      </div>
      
      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, index) => (
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
                    className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-neutral-50 transition"
                    onClick={() => handlePlayerClick(player.id)}
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                      {player.name.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <div className="font-medium">{player.name}</div>
                      <div className="text-sm text-neutral-500">
                        {player.defaultHandicap !== null
                          ? `Handicap: ${player.defaultHandicap}`
                          : "No handicap set"}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-8">
                  <div className="text-neutral-400">No players found</div>
                  {searchQuery && (
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={() => setSearchQuery("")}
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}