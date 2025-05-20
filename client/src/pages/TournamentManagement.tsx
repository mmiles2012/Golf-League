import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Pencil, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDate } from "@/lib/utils";
import DeleteTournamentDialog from "@/components/custom/DeleteTournamentDialog";

interface Tournament {
  id: number;
  name: string;
  date: string;
  type: 'major' | 'tour' | 'league' | 'supr';
  status: 'completed' | 'upcoming' | 'in-progress';
  createdAt: string;
}

export default function TournamentManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [, navigate] = useLocation();
  
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Fetch tournaments data
  const { data: tournaments, isLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"],
    staleTime: 30 * 1000, // 30 seconds
  });
  
  // Filter tournaments based on search query
  const filteredTournaments = tournaments ? 
    tournaments.filter(tournament => 
      tournament.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    ) : [];
  
  const handleEditClick = (tournament: Tournament) => {
    // Navigate to the edit tournament page
    navigate(`/tournament/edit/${tournament.id}`);
  };
  
  const handleDeleteClick = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setIsDeleteDialogOpen(true);
  };
  
  // Get player count for each tournament from the results
  const getPlayerCount = (tournament: Tournament) => {
    return tournament.results?.length || 0;
  };
  
  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-neutral-800">Tournament Management</h1>
          <p className="text-neutral-600">View, edit and manage tournament data</p>
        </div>
      </div>
      
      {/* Featured Image for Tournaments */}
      <Card className="overflow-hidden shadow-lg">
        <div className="h-64 overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1592919505780-303950717480?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400&q=80" 
            alt="Golf tournament leaderboard" 
            className="w-full h-64 object-cover"
          />
        </div>
        <CardContent className="p-5">
          <h2 className="text-xl font-heading font-bold">Tournament Database</h2>
          <p className="text-neutral-600 mt-2">
            All tournament results are stored in the database. You can edit or delete tournament data if needed. 
            Deleting a tournament will recalculate all season points.
          </p>
        </CardContent>
      </Card>
      
      {/* Tournament List */}
      <Card>
        <div className="px-5 py-4 border-b border-neutral-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="font-heading font-bold text-lg">Tournaments</h3>
          <div className="relative w-full md:w-auto">
            <Input
              type="text"
              placeholder="Search tournaments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-8"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search className="h-4 w-4 text-neutral-400" />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-100">
                <th className="py-2 pl-5 pr-2 text-left text-sm font-medium text-neutral-700">Name</th>
                <th className="px-2 py-2 text-left text-sm font-medium text-neutral-700">Date</th>
                <th className="px-2 py-2 text-left text-sm font-medium text-neutral-700">Type</th>
                <th className="px-2 py-2 text-left text-sm font-medium text-neutral-700">Players</th>
                <th className="px-2 py-2 text-left text-sm font-medium text-neutral-700">Status</th>
                <th className="px-2 py-2 text-right text-sm font-medium text-neutral-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {isLoading ? (
                Array(5).fill(0).map((_, index) => (
                  <tr key={index}>
                    <td className="py-3 pl-5 pr-2 whitespace-nowrap">
                      <Skeleton className="h-5 w-40" />
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <Skeleton className="h-5 w-24" />
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <Skeleton className="h-5 w-16" />
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <Skeleton className="h-5 w-8" />
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <Skeleton className="h-5 w-20" />
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-right">
                      <Skeleton className="h-5 w-16 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredTournaments.length > 0 ? (
                filteredTournaments.map((tournament) => (
                  <tr key={tournament.id} className="hover:bg-neutral-50">
                    <td className="py-3 pl-5 pr-2 whitespace-nowrap text-sm font-medium">
                      {tournament.name}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-sm">
                      {formatDate(tournament.date)}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-sm">
                      <Badge variant={tournament.type}>
                        {tournament.type.charAt(0).toUpperCase() + tournament.type.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-sm">
                      {tournament.status === 'upcoming' ? '-' : getPlayerCount(tournament)}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-sm">
                      <Badge variant={tournament.status}>
                        {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-sm text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(tournament)}
                        className="text-primary hover:text-primary-dark mr-1"
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(tournament)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-neutral-500">
                    {searchQuery ? "No tournaments match your search" : "No tournaments found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {/* Pagination (simplified) */}
          {!isLoading && filteredTournaments.length > 0 && (
            <div className="px-5 py-3 flex items-center justify-between border-t border-neutral-200">
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-neutral-700">
                    Showing <span className="font-medium">1</span> to{" "}
                    <span className="font-medium">{filteredTournaments.length}</span> of{" "}
                    <span className="font-medium">{filteredTournaments.length}</span> tournaments
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
      
      {/* Modals */}
      <DeleteTournamentDialog
        tournament={selectedTournament}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
      />
    </section>
  );
}
