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
            
            {/* Custom Table with Fixed First Column */}
            <div className="border border-neutral-200 rounded-md" style={{ height: '60vh', overflow: 'hidden' }}>
              {/* Give the container a position: relative to establish positioning context for sticky elements */}
              <div className="relative w-full h-full">
                {/* Container for horizontal scrolling */}
                <div className="overflow-x-auto overflow-y-auto w-full h-full" style={{ paddingLeft: '200px' }}>
                  {/* Main table - includes all columns */}
                  <table className="w-full border-separate border-spacing-0">
                    <thead>
                      <tr>
                        {/* Fixed header cell for tournament - will be covered by the fixed column */}
                        <th className="sticky top-0 left-0 z-30 bg-neutral-100 w-[200px] py-3 px-4 text-left font-medium text-sm text-neutral-600 border-b border-neutral-200">
                          Tournament
                        </th>
                        {/* Regular scrollable headers */}
                        <th className="sticky top-0 z-20 bg-neutral-100 py-3 px-4 text-left font-medium text-sm text-neutral-600 min-w-[120px] border-b border-neutral-200">Date</th>
                        <th className="sticky top-0 z-20 bg-neutral-100 py-3 px-4 text-left font-medium text-sm text-neutral-600 min-w-[100px] border-b border-neutral-200">Type</th>
                        <th className="sticky top-0 z-20 bg-neutral-100 py-3 px-4 text-center font-medium text-sm text-neutral-600 min-w-[80px] border-b border-neutral-200">Net Pos</th>
                        <th className="sticky top-0 z-20 bg-neutral-100 py-3 px-4 text-center font-medium text-sm text-neutral-600 min-w-[90px] border-b border-neutral-200">Net Points</th>
                        <th className="sticky top-0 z-20 bg-neutral-100 py-3 px-4 text-center font-medium text-sm text-neutral-600 min-w-[80px] border-b border-neutral-200">Gross Pos</th>
                        <th className="sticky top-0 z-20 bg-neutral-100 py-3 px-4 text-center font-medium text-sm text-neutral-600 min-w-[100px] border-b border-neutral-200">Gross Points</th>
                        <th className="sticky top-0 z-20 bg-neutral-100 py-3 px-4 text-center font-medium text-sm text-neutral-600 min-w-[70px] border-b border-neutral-200">Gross</th>
                        <th className="sticky top-0 z-20 bg-neutral-100 py-3 px-4 text-center font-medium text-sm text-neutral-600 min-w-[70px] border-b border-neutral-200">Net</th>
                        <th className="sticky top-0 z-20 bg-neutral-100 py-3 px-4 text-center font-medium text-sm text-neutral-600 min-w-[90px] border-b border-neutral-200">Handicap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerHistory.tournaments
                        .sort((a, b) => new Date(b.tournamentDate).getTime() - new Date(a.tournamentDate).getTime())
                        .map((tournament) => (
                        <tr key={tournament.id} className="hover:bg-neutral-50">
                          {/* This will be covered by the fixed column wrapper below */}
                          <td className="border-b border-neutral-200 py-3 px-4 text-sm text-left">{tournament.tournamentName}</td>
                          
                          <td className="border-b border-neutral-200 py-3 px-4 text-sm text-left">{formatDate(tournament.tournamentDate)}</td>
                          <td className="border-b border-neutral-200 py-3 px-4 text-sm text-left">
                            <Badge variant={tournament.tournamentType}>{tournamentTypeLabel(tournament.tournamentType)}</Badge>
                          </td>
                          <td className="border-b border-neutral-200 py-3 px-4 text-sm text-center">{tournament.position}</td>
                          <td className="border-b border-neutral-200 py-3 px-4 text-sm text-center font-medium">
                            {tournament.position 
                              ? calculatePoints(tournament.position, tournament.tournamentType) 
                              : "0"}
                          </td>
                          <td className="border-b border-neutral-200 py-3 px-4 text-sm text-center">
                            {tournament.grossPosition || "N/A"}
                          </td>
                          <td className="border-b border-neutral-200 py-3 px-4 text-sm text-center font-medium">
                            {tournament.grossPosition 
                              ? calculatePoints(tournament.grossPosition, tournament.tournamentType) 
                              : "0"}
                          </td>
                          <td className="border-b border-neutral-200 py-3 px-4 text-sm text-center">
                            {tournament.grossScore ? tournament.grossScore : "N/A"}
                          </td>
                          <td className="border-b border-neutral-200 py-3 px-4 text-sm text-center">
                            {tournament.netScore ? tournament.netScore : "N/A"}
                          </td>
                          <td className="border-b border-neutral-200 py-3 px-4 text-sm text-center">
                            {tournament.handicap !== null ? 
                              (tournament.originalHandicap ? 
                                tournament.originalHandicap : 
                                (tournament.handicap > 0 && 
                                 tournament.grossScore < tournament.netScore ? 
                                  `+${tournament.handicap}` : 
                                  tournament.handicap)) : 
                              "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Fixed first column - absolutely positioned over the main table */}
                <div className="absolute top-0 left-0 bottom-0 w-[200px] bg-white z-10 overflow-hidden border-r border-neutral-200">
                  <table className="w-full border-separate border-spacing-0 h-full">
                    <thead>
                      <tr>
                        <th className="sticky top-0 bg-neutral-100 z-20 py-3 px-4 text-left font-medium text-sm text-neutral-600 border-b border-neutral-200">
                          Tournament
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerHistory.tournaments
                        .sort((a, b) => new Date(b.tournamentDate).getTime() - new Date(a.tournamentDate).getTime())
                        .map((tournament) => (
                        <tr key={`fixed-${tournament.id}`} className="hover:bg-neutral-50">
                          <td className="border-b border-neutral-200 py-3 px-4 text-sm font-medium">
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
