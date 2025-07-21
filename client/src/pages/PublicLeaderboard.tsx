import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import type { PlayerWithHistory } from '@shared/schema';
import PlayerDetailsModal from '@/components/custom/PlayerDetailsModal';

interface PublicLeaderboardProps {
  type: 'net' | 'gross';
}

export default function PublicLeaderboard({ type }: PublicLeaderboardProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [isPlayerDetailsOpen, setIsPlayerDetailsOpen] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [numRows, setNumRows] = useState(10);
  const [useCustomColors, setUseCustomColors] = useState(true);
  const [showLogo, setShowLogo] = useState(true);

  // Parse URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    if (searchParams.has('header')) {
      setShowHeader(searchParams.get('header') === 'true');
    }

    if (searchParams.has('rows')) {
      const rows = searchParams.get('rows');
      if (rows === 'all') {
        setNumRows(1000); // A high number to show all
      } else {
        const parsedRows = parseInt(rows || '10');
        if (!isNaN(parsedRows)) {
          setNumRows(parsedRows);
        }
      }
    }

    if (searchParams.has('colors')) {
      setUseCustomColors(searchParams.get('colors') === 'true');
    }

    if (searchParams.has('logo')) {
      setShowLogo(searchParams.get('logo') === 'true');
    }
  }, []);

  // Fetch leaderboard data
  const { data: leaderboardData, isLoading } = useQuery<PlayerWithHistory[]>({
    queryKey: [`/api/leaderboard/${type}`],
    staleTime: 60 * 1000, // 1 minute
  });

  const handlePlayerClick = (playerId: number) => {
    setSelectedPlayerId(playerId);
    setIsPlayerDetailsOpen(true);
  };

  // Limit the number of rows to display
  const limitedData = leaderboardData ? leaderboardData.slice(0, numRows) : [];

  // Define columns for DataTable
  const columns: ColumnDef<PlayerWithHistory>[] =
    type === 'gross'
      ? [
          {
            accessorKey: 'rank',
            header: 'Pos',
            cell: ({ row }) => <div className="font-medium">{row.original.rank}</div>,
          },
          {
            accessorKey: 'player.name',
            header: 'Player',
            cell: ({ row }) => <div className="font-medium">{row.original.player.name}</div>,
          },
          {
            accessorKey: 'totalEvents',
            header: 'Events',
            cell: ({ row }) => <div className="text-center">{row.original.totalEvents}</div>,
          },
          {
            accessorKey: 'grossTotalPoints',
            header: 'Gross Points',
            cell: ({ row }) => (
              <div className="font-bold text-right">
                {(row.original.grossTotalPoints || 0).toLocaleString()}
              </div>
            ),
          },
          {
            accessorKey: 'grossTourPoints',
            header: 'Gross Tour Points',
            cell: ({ row }) => (
              <div className="text-right">
                {(row.original.grossTourPoints || 0).toLocaleString()}
              </div>
            ),
          },
        ]
      : [
          {
            accessorKey: 'rank',
            header: 'Pos',
            cell: ({ row }) => <div className="font-medium">{row.original.rank}</div>,
          },
          {
            accessorKey: 'player.name',
            header: 'Player',
            cell: ({ row }) => <div className="font-medium">{row.original.player.name}</div>,
          },
          {
            accessorKey: 'totalEvents',
            header: 'Events',
            cell: ({ row }) => <div className="text-center">{row.original.totalEvents}</div>,
          },
          {
            accessorKey: 'totalPoints',
            header: 'Total Points',
            cell: ({ row }) => (
              <div className="font-bold text-right">
                {row.original.totalPoints.toLocaleString()}
              </div>
            ),
          },
        ];

  return (
    <div className={`min-h-screen ${useCustomColors ? 'bg-neutral-100' : 'bg-white'}`}>
      {showHeader && (
        <header
          className={`py-4 ${useCustomColors ? 'bg-primary text-white' : 'bg-gray-100 text-gray-900'}`}
        >
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between">
              {showLogo && (
                <div className="flex items-center space-x-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                    />
                  </svg>
                  <h1 className="text-xl font-bold">Hideout Golf League</h1>
                </div>
              )}
              <Badge variant={useCustomColors ? 'secondary' : 'outline'}>
                {type === 'net' ? 'Net' : 'Gross'} Leaderboard
              </Badge>
            </div>
          </div>
        </header>
      )}

      <main className="container mx-auto px-4 py-6">
        <Card className={useCustomColors ? 'shadow' : 'border'}>
          {isLoading ? (
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                {Array(numRows)
                  .fill(0)
                  .map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
              </div>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <DataTable
                columns={columns}
                data={limitedData}
                rowClickHandler={(row) => handlePlayerClick(row.player.id)}
                pagination={false}
              />
            </div>
          )}
        </Card>

        {/* Small branding footer */}
        <div className="mt-4 text-center text-xs text-neutral-500">
          Powered by Hideout Golf League Tracker
        </div>
      </main>

      {/* Player Details Modal */}
      <PlayerDetailsModal
        playerId={selectedPlayerId}
        isOpen={isPlayerDetailsOpen}
        onClose={() => setIsPlayerDetailsOpen(false)}
      />
    </div>
  );
}
