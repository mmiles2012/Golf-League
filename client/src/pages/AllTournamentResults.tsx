import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ArrowUpRight, CalendarDays } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tournament, PlayerResult } from '@shared/schema';
import { useDebounce } from '@/hooks/use-debounce';
import { formatDate } from '@/lib/utils';

// Function to get tournament type label
function getTournamentTypeLabel(type: string): string {
  switch (type) {
    case 'major':
      return 'Major';
    case 'tour':
      return 'Tour';
    case 'league':
      return 'League';
    case 'supr':
      return 'SUPR Club';
    default:
      return type;
  }
}

// Function to get tournament type badge variant
function getTournamentTypeBadgeVariant(type: string): string {
  switch (type) {
    case 'major':
      return 'major';
    case 'tour':
      return 'tour';
    case 'league':
      return 'league';
    case 'supr':
      return 'supr';
    default:
      return 'default';
  }
}

export default function AllTournamentResults() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Fetch all tournaments with their player counts
  const { data: tournaments, isLoading } = useQuery<Tournament[]>({
    queryKey: ['/api/tournaments'],
    staleTime: 60 * 1000, // 1 minute
  });

  // Fetch player results for player count calculation
  const { data: playerResults } = useQuery<PlayerResult[]>({
    queryKey: ['/api/player-results'],
    staleTime: 60 * 1000, // 1 minute
  });

  // Calculate player count for each tournament
  const getPlayerCount = (tournamentId: number) => {
    if (!playerResults || !Array.isArray(playerResults)) return 0;
    return playerResults.filter((result) => result.tournamentId === tournamentId).length;
  };

  // Filter tournaments based on search query
  const filteredTournaments = tournaments
    ? tournaments
        .filter((tournament) =>
          tournament.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()),
        )
        .sort((a, b) => {
          // Sort by date descending (newest first)
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        })
    : [];

  const handleViewResults = (tournamentId: number) => {
    navigate(`/tournament/${tournamentId}`);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-neutral-800">
            Tournament Results
          </h1>
          <p className="text-neutral-600">View all tournament results and leaderboards</p>
        </div>
      </div>

      {/* Search and filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Find Tournament</CardTitle>
          <CardDescription>Search for a specific tournament by name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search tournaments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tournament list */}
      <Card>
        <CardHeader>
          <CardTitle>All Tournaments</CardTitle>
          <CardDescription>Select a tournament to view detailed results</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-md" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tournament</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Players</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTournaments.length > 0 ? (
                    filteredTournaments.map((tournament) => (
                      <TableRow
                        key={tournament.id}
                        className="hover:bg-neutral-50 cursor-pointer"
                        onClick={() => handleViewResults(tournament.id)}
                      >
                        <TableCell className="font-medium">{tournament.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <CalendarDays className="mr-2 h-4 w-4 text-neutral-400" />
                            {formatDate(tournament.date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTournamentTypeBadgeVariant(tournament.type) as any}>
                            {getTournamentTypeLabel(tournament.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>{getPlayerCount(tournament.id)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewResults(tournament.id);
                            }}
                          >
                            View Results
                            <ArrowUpRight className="ml-2 h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-neutral-500">
                        {searchQuery ? (
                          <>No tournaments found matching "{searchQuery}"</>
                        ) : (
                          <>No tournaments available</>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
