import { useState } from "react";
import { Link } from "wouter";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { PlayerWithHistory } from "@shared/schema";
import { formatDate } from "@/lib/utils";
import { calculatePoints } from "@/lib/points-calculator";

interface PlayerDetailsModalProps {
  playerId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PlayerDetailsModal({ playerId, isOpen, onClose }: PlayerDetailsModalProps) {
  // Only fetch data when the modal is open and we have a playerId
  const enabled = isOpen && playerId !== null;
  
  const { data: playerHistory, isLoading } = useQuery<PlayerWithHistory>({
    queryKey: [`/api/players/${playerId}/history`],
    enabled,
  });
  
  if (!isOpen || !playerId) {
    return null;
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-4 md:p-6">
        <DialogHeader className="p-0">
          <DialogTitle>
            {isLoading ? "Loading player details..." : `${playerHistory?.player.name}`}
          </DialogTitle>
          <DialogDescription className="text-sm text-neutral-500">
            View tournament history and detailed statistics
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : playerHistory ? (
          <div className="my-4">
            {/* Statistics section removed as requested */}
            
            <h4 className="font-heading font-semibold text-md mb-2">Tournament History</h4>
            <div className="w-full overflow-hidden max-h-[50vh] md:max-h-[60vh]">
              {/* Mobile-optimized table with true horizontal scrolling */}
              <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pb-4 -mx-4 px-4">
                <div style={{ width: 'max-content', minWidth: '100%' }}>
                  <table className="border-separate border-spacing-0" style={{ tableLayout: 'fixed', width: 'auto' }}>
                    <thead className="bg-neutral-100 sticky top-0 z-10">
                      <tr>
                        <th className="py-3 px-4 text-left font-medium text-sm text-neutral-600 whitespace-nowrap" style={{ width: '160px' }}>Tournament</th>
                        <th className="py-3 px-4 text-left font-medium text-sm text-neutral-600 whitespace-nowrap" style={{ width: '100px' }}>Date</th>
                        <th className="py-3 px-4 text-left font-medium text-sm text-neutral-600 whitespace-nowrap" style={{ width: '80px' }}>Type</th>
                        <th className="py-3 px-4 text-center font-medium text-sm text-neutral-600 whitespace-nowrap" style={{ width: '80px' }}>Net Pos</th>
                        <th className="py-3 px-4 text-center font-medium text-sm text-neutral-600 whitespace-nowrap" style={{ width: '80px' }}>Gross Pos</th>
                        <th className="py-3 px-4 text-center font-medium text-sm text-neutral-600 whitespace-nowrap" style={{ width: '80px' }}>Gross</th>
                        <th className="py-3 px-4 text-center font-medium text-sm text-neutral-600 whitespace-nowrap" style={{ width: '80px' }}>Net</th>
                        <th className="py-3 px-4 text-center font-medium text-sm text-neutral-600 whitespace-nowrap" style={{ width: '80px' }}>Handicap</th>
                        <th className="py-3 px-4 text-center font-medium text-sm text-neutral-600 whitespace-nowrap" style={{ width: '100px' }}>Gross Points</th>
                        <th className="py-3 px-4 text-center font-medium text-sm text-neutral-600 whitespace-nowrap" style={{ width: '100px' }}>Net Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {playerHistory.tournaments
                        .sort((a, b) => new Date(b.tournamentDate).getTime() - new Date(a.tournamentDate).getTime())
                        .map((tournament) => (
                        <tr key={tournament.id} className="hover:bg-neutral-50">
                          <td className="py-3 px-4 text-sm font-medium whitespace-nowrap border-b border-neutral-100">
                            <a
                              href={`/tournament/${tournament.tournamentId}`}
                              className="text-primary hover:text-primary-dark hover:underline cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                onClose();
                                window.location.href = `/tournament/${tournament.tournamentId}`;
                              }}
                            >
                              {tournament.tournamentName}
                            </a>
                          </td>
                          <td className="py-3 px-4 text-sm whitespace-nowrap border-b border-neutral-100">{formatDate(tournament.tournamentDate)}</td>
                          <td className="py-3 px-4 text-sm whitespace-nowrap border-b border-neutral-100">
                            <Badge variant={tournament.tournamentType}>{tournamentTypeLabel(tournament.tournamentType)}</Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-center whitespace-nowrap border-b border-neutral-100">{tournament.position}</td>
                          <td className="py-3 px-4 text-sm text-center whitespace-nowrap border-b border-neutral-100">
                            {tournament.grossPosition || "N/A"}
                          </td>
                          <td className="py-3 px-4 text-sm text-center whitespace-nowrap border-b border-neutral-100">
                            {tournament.grossScore ? tournament.grossScore : "N/A"}
                          </td>
                          <td className="py-3 px-4 text-sm text-center whitespace-nowrap border-b border-neutral-100">
                            {tournament.netScore ? tournament.netScore : "N/A"}
                          </td>
                          <td className="py-3 px-4 text-sm text-center whitespace-nowrap border-b border-neutral-100">
                            {tournament.handicap !== null ? 
                              (tournament.originalHandicap ? 
                                tournament.originalHandicap : 
                                (tournament.handicap > 0 && 
                                 tournament.grossScore < tournament.netScore ? 
                                  `+${tournament.handicap}` : 
                                  tournament.handicap)) : 
                              "N/A"}
                          </td>
                          <td className="py-3 px-4 text-sm text-center whitespace-nowrap border-b border-neutral-100">
                            {tournament.grossPosition 
                              ? calculatePoints(tournament.grossPosition, tournament.tournamentType) 
                              : "0"}
                          </td>
                          <td className="py-3 px-4 text-sm text-center whitespace-nowrap border-b border-neutral-100">
                            {tournament.position 
                              ? calculatePoints(tournament.position, tournament.tournamentType) 
                              : "0"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs text-neutral-500 italic text-center">Tip: Swipe left/right to view all data.</div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p>No player data available</p>
          </div>
        )}
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to get ordinal suffix for numbers
function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  
  if (j === 1 && k !== 11) {
    return "st";
  }
  if (j === 2 && k !== 12) {
    return "nd";
  }
  if (j === 3 && k !== 13) {
    return "rd";
  }
  return "th";
}

// Helper function to get formatted tournament type label
function tournamentTypeLabel(type: string): string {
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
