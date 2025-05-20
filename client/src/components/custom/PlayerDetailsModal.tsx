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
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {isLoading ? "Loading player details..." : `${playerHistory?.player.name}`}
          </DialogTitle>
          <p className="text-sm text-neutral-500">
            View tournament history and detailed statistics
          </p>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : playerHistory ? (
          <div className="my-4">
            {/* Statistics section removed as requested */}
            
            <h4 className="font-heading font-semibold text-md mb-2">Tournament History</h4>
            <div className="overflow-auto max-h-[60vh] relative">
              <div className="overflow-x-auto min-w-full pb-4">
                <div className="inline-block min-w-full align-middle">
                  <Table className="min-w-full">
                    <TableHeader className="bg-neutral-100 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="min-w-[160px] w-1/4">Tournament</TableHead>
                        <TableHead className="min-w-[100px]">Date</TableHead>
                        <TableHead className="min-w-[80px]">Type</TableHead>
                        <TableHead className="text-center min-w-[80px]">Net Pos</TableHead>
                        <TableHead className="text-center min-w-[80px]">Gross Pos</TableHead>
                        <TableHead className="text-center min-w-[80px]">Gross</TableHead>
                        <TableHead className="text-center min-w-[80px]">Net</TableHead>
                        <TableHead className="text-center min-w-[100px]">Gross Points</TableHead>
                        <TableHead className="text-center min-w-[100px]">Net Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-neutral-200">
                      {playerHistory.tournaments
                        .sort((a, b) => new Date(b.tournamentDate).getTime() - new Date(a.tournamentDate).getTime())
                        .map((tournament) => (
                        <TableRow key={tournament.id}>
                          <TableCell className="font-medium whitespace-nowrap">
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
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{formatDate(tournament.tournamentDate)}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant={tournament.tournamentType}>{tournamentTypeLabel(tournament.tournamentType)}</Badge>
                          </TableCell>
                          <TableCell className="text-center whitespace-nowrap">{tournament.position}</TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            {tournament.grossPosition || "N/A"}
                          </TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            {tournament.grossScore ? tournament.grossScore : "N/A"}
                          </TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            {tournament.netScore ? tournament.netScore : "N/A"}
                          </TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            {tournament.grossPosition 
                              ? calculatePoints(tournament.grossPosition, tournament.tournamentType) 
                              : "0"}
                          </TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            {tournament.position 
                              ? calculatePoints(tournament.position, tournament.tournamentType) 
                              : "0"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs text-neutral-500 italic hidden md:block">Tip: Use mouse wheel or trackpad to scroll horizontally.</div>
            <div className="mt-2 text-xs text-neutral-500 italic md:hidden">Tip: Swipe left/right to view all data.</div>
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
