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
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="bg-neutral-100 rounded-md p-3 flex-1 min-w-[120px]">
                <p className="text-xs text-neutral-600">Rank</p>
                <p className="font-bold text-xl">{playerHistory.rank}</p>
              </div>
              <div className="bg-neutral-100 rounded-md p-3 flex-1 min-w-[120px]">
                <p className="text-xs text-neutral-600">Events</p>
                <p className="font-bold text-xl">{playerHistory.totalEvents}</p>
              </div>
              <div className="bg-neutral-100 rounded-md p-3 flex-1 min-w-[120px]">
                <p className="text-xs text-neutral-600">Total Points</p>
                <p className="font-bold text-xl">{playerHistory.totalPoints.toLocaleString()}</p>
              </div>
              <div className="bg-neutral-100 rounded-md p-3 flex-1 min-w-[120px]">
                <p className="text-xs text-neutral-600">Best Finish</p>
                <p className="font-bold text-xl">
                  {playerHistory.tournaments.length > 0 ? 
                    `${Math.min(...playerHistory.tournaments.map(t => t.position))}${getOrdinalSuffix(Math.min(...playerHistory.tournaments.map(t => t.position)))}` : 
                    "N/A"}
                </p>
              </div>
            </div>
            
            <h4 className="font-heading font-semibold text-md mb-2">Tournament History</h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-neutral-100">
                  <TableRow>
                    <TableHead className="w-1/4">Tournament</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Net Pos</TableHead>
                    <TableHead className="text-center">Gross Pos</TableHead>
                    <TableHead className="text-center">Gross</TableHead>
                    <TableHead className="text-center">Net</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-neutral-200">
                  {playerHistory.tournaments
                    .sort((a, b) => new Date(b.tournamentDate).getTime() - new Date(a.tournamentDate).getTime())
                    .map((tournament) => (
                    <TableRow key={tournament.id}>
                      <TableCell className="font-medium">
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
                      <TableCell>{formatDate(tournament.tournamentDate)}</TableCell>
                      <TableCell>
                        <Badge variant={tournament.tournamentType}>{tournamentTypeLabel(tournament.tournamentType)}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{tournament.position}</TableCell>
                      <TableCell className="text-center">
                        {tournament.grossPosition || "N/A"}
                      </TableCell>
                      <TableCell className="text-center">
                        {tournament.grossScore ? tournament.grossScore : "N/A"}
                      </TableCell>
                      <TableCell className="text-center">
                        {tournament.netScore ? tournament.netScore : "N/A"}
                      </TableCell>
                      <TableCell className="text-right font-medium">{tournament.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
