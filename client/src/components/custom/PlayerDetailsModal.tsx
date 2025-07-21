import { useState } from 'react';
import { Link } from 'wouter';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { PlayerWithHistory } from '@shared/schema';
import { formatDate } from '@/lib/utils';

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
            {isLoading ? 'Loading player details...' : `${playerHistory?.player?.name ?? ''}`}
          </DialogTitle>
          <DialogDescription className="text-sm text-neutral-500">
            View tournament history and detailed statistics
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="my-4">
            <h4 className="font-heading font-semibold text-md mb-2">Tournament History</h4>
            <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-rounded pb-4">
              <div className="min-w-[900px]">
                <table className="w-full text-sm text-left border-separate border-spacing-0">
                  <thead className="bg-neutral-100 sticky top-0 z-10">
                    <tr>
                      <th className="py-2 px-4 font-semibold text-neutral-700 min-w-[200px] text-left sticky left-0 bg-white z-20">
                        Tournament
                      </th>
                      <th className="py-2 px-4 font-semibold text-neutral-700 min-w-[100px] text-left">
                        Date
                      </th>
                      <th className="py-2 px-4 font-semibold text-neutral-700 min-w-[80px] text-left">
                        Type
                      </th>
                      <th className="py-2 px-4 font-semibold text-neutral-700 min-w-[80px] text-center">
                        Net Pos
                      </th>
                      <th className="py-2 px-4 font-semibold text-neutral-700 min-w-[90px] text-center">
                        Net Points
                      </th>
                      <th className="py-2 px-4 font-semibold text-neutral-700 min-w-[80px] text-center">
                        Gross Pos
                      </th>
                      <th className="py-2 px-4 font-semibold text-neutral-700 min-w-[90px] text-center">
                        Gross Points
                      </th>
                      <th className="py-2 px-4 font-semibold text-neutral-700 min-w-[70px] text-center">
                        Gross
                      </th>
                      <th className="py-2 px-4 font-semibold text-neutral-700 min-w-[70px] text-center">
                        Net
                      </th>
                      <th className="py-2 px-4 font-semibold text-neutral-700 min-w-[90px] text-center">
                        Handicap
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {Array(8)
                      .fill(0)
                      .map((_, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-4 bg-white sticky left-0 z-10 border-b border-gray-200">
                            <Skeleton className="h-5 w-32" />
                          </td>
                          <td className="py-2 px-4 border-b border-gray-200">
                            <Skeleton className="h-5 w-20" />
                          </td>
                          <td className="py-2 px-4 border-b border-gray-200">
                            <Skeleton className="h-5 w-12" />
                          </td>
                          <td className="py-2 px-4 border-b border-gray-200 text-center">
                            <Skeleton className="h-5 w-8 mx-auto" />
                          </td>
                          <td className="py-2 px-4 border-b border-gray-200 text-center">
                            <Skeleton className="h-5 w-10 mx-auto" />
                          </td>
                          <td className="py-2 px-4 border-b border-gray-200 text-center">
                            <Skeleton className="h-5 w-8 mx-auto" />
                          </td>
                          <td className="py-2 px-4 border-b border-gray-200 text-center">
                            <Skeleton className="h-5 w-10 mx-auto" />
                          </td>
                          <td className="py-2 px-4 border-b border-gray-200 text-center">
                            <Skeleton className="h-5 w-10 mx-auto" />
                          </td>
                          <td className="py-2 px-4 border-b border-gray-200 text-center">
                            <Skeleton className="h-5 w-10 mx-auto" />
                          </td>
                          <td className="py-2 px-4 border-b border-gray-200 text-center">
                            <Skeleton className="h-5 w-10 mx-auto" />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-2 text-xs text-neutral-500 italic text-center">
              Tip: Swipe left/right to view all data.
            </div>
          </div>
        ) : playerHistory ? (
          <div className="my-4">
            {/* Statistics section removed as requested */}

            <h4 className="font-heading font-semibold text-md mb-2">Tournament History</h4>
            <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-rounded pb-4">
              <div className="min-w-[900px]">
                <table className="w-full text-sm text-left border-separate border-spacing-0">
                  <thead className="bg-neutral-100 sticky top-0 z-10">
                    <tr>
                      <th className="py-2 px-4 font-semibold text-neutral-700 min-w-[200px] text-left sticky left-0 bg-white z-20">
                        Tournament
                      </th>
                      <th className="py-2 px-4 font-semibold text-neutral-700 min-w-[100px] text-left">
                        Date
                      </th>
                      <th className="py-2 px-4 font-semibold text-neutral-700 min-w-[80px] text-left">
                        Type
                      </th>
                      <th className="py-2 px-4 font-semibold text-neutral-700 min-w-[80px] text-center">
                        Net Pos
                      </th>
                      <th className="py-2 px-4 font-semibold text-neutral-700 min-w-[90px] text-center">
                        Net Points
                      </th>
                      <th className="py-2 px-4 font-semibold text-neutral-700 min-w-[80px] text-center">
                        Gross Pos
                      </th>
                      <th className="py-2 px-4 font-semibold text-neutral-700 min-w-[90px] text-center">
                        Gross Points
                      </th>
                      <th className="py-2 px-4 font-semibold text-neutral-700 min-w-[70px] text-center">
                        Gross
                      </th>
                      <th className="py-2 px-4 font-semibold text-neutral-700 min-w-[70px] text-center">
                        Net
                      </th>
                      <th className="py-2 px-4 font-semibold text-neutral-700 min-w-[90px] text-center">
                        Handicap
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {playerHistory.tournaments
                      .sort(
                        (a: any, b: any) =>
                          new Date(b.tournamentDate).getTime() -
                          new Date(a.tournamentDate).getTime(),
                      )
                      .map((tournament: any) => (
                        <tr key={tournament.id} className="hover:bg-gray-50">
                          <td className="py-2 px-4 text-sm font-medium bg-white sticky left-0 z-10 border-b border-gray-200">
                            <a
                              href={`/tournament/${tournament.tournamentId}`}
                              className="text-primary hover:text-primary-dark hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                                onClose();
                                window.location.href = `/tournament/${tournament.tournamentId}`;
                              }}
                            >
                              {tournament.tournamentName}
                            </a>
                          </td>
                          <td className="py-2 px-4 text-sm border-b border-gray-200">
                            {formatDate(tournament.tournamentDate)}
                          </td>
                          <td className="py-2 px-4 text-sm border-b border-gray-200">
                            <Badge variant={tournament.tournamentType}>
                              {tournamentTypeLabel(tournament.tournamentType)}
                            </Badge>
                          </td>
                          <td className="py-2 px-4 text-sm text-center border-b border-gray-200">
                            {tournament.position}
                          </td>
                          <td className="py-2 px-4 text-sm text-center border-b border-gray-200 font-medium">
                            {tournament.points || '0'}
                          </td>
                          <td className="py-2 px-4 text-sm text-center border-b border-gray-200">
                            {tournament.grossPosition || 'N/A'}
                          </td>
                          <td className="py-2 px-4 text-sm text-center border-b border-gray-200 font-medium">
                            {tournament.grossPoints || '0'}
                          </td>
                          <td className="py-2 px-4 text-sm text-center border-b border-gray-200">
                            {tournament.grossScore ? tournament.grossScore : 'N/A'}
                          </td>
                          <td className="py-2 px-4 text-sm text-center border-b border-gray-200">
                            {tournament.netScore ? tournament.netScore : 'N/A'}
                          </td>
                          <td className="py-2 px-4 text-sm text-center border-b border-gray-200">
                            {tournament.handicap !== null && tournament.handicap !== undefined
                              ? tournament.handicap > 0 &&
                                tournament.grossScore != null &&
                                tournament.netScore != null &&
                                tournament.grossScore < tournament.netScore
                                ? `+${tournament.handicap}`
                                : tournament.handicap
                              : 'N/A'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-2 text-xs text-neutral-500 italic text-center">
              Tip: Swipe left/right to view all data.
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
    return 'st';
  }
  if (j === 2 && k !== 12) {
    return 'nd';
  }
  if (j === 3 && k !== 13) {
    return 'rd';
  }
  return 'th';
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
