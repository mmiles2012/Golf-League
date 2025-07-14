import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import PlayerDetailsModal from "@/components/custom/PlayerDetailsModal";
import { Skeleton } from "@/components/ui/skeleton";

function getTournamentTypeLabel(type: string): string {
  switch (type.toLowerCase()) {
    case 'major':
      return 'Major';
    case 'tour':
      return 'Tour';
    case 'league':
      return 'League';
    case 'supr':
      return 'SUPR';
    default:
      return type;
  }
}

interface TournamentResultsProps {
  id?: string;
}

export default function TournamentResults({ id }: TournamentResultsProps) {
  const tournamentId = id ? parseInt(id) : null;
  const [activeTab, setActiveTab] = useState<"net" | "gross">("net");
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [isPlayerDetailsOpen, setIsPlayerDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const rowsPerPage = 25;

  // Early return if no valid tournament ID
  if (!tournamentId || tournamentId <= 0) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-neutral-600">Invalid tournament ID</p>
      </div>
    );
  }

  // Fetch tournament details
  const { data: tournament, isLoading: tournamentLoading } = useQuery({
    queryKey: ['/api/tournaments', tournamentId],
  });

  // Helper type for tournament
  type Tournament = {
    id: number;
    name: string;
    date: string;
    type: string;
  };

  // Fetch paginated tournament results for both tabs
  const {
    data: pagedNetResults,
    isLoading: isNetLoading
  } = useQuery<{ data: any[]; total: number }>({
    queryKey: [`/api/tournaments/${tournamentId}/results/net`, { page: currentPage, limit: rowsPerPage }],
    queryFn: async () => {
      const url = `/api/tournaments/${tournamentId}/results/net?page=${currentPage}&limit=${rowsPerPage}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch net results');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!tournamentId && activeTab === 'net',
  });
  const {
    data: pagedGrossResults,
    isLoading: isGrossLoading
  } = useQuery<{ data: any[]; total: number }>({
    queryKey: [`/api/tournaments/${tournamentId}/results/gross`, { page: currentPage, limit: rowsPerPage }],
    queryFn: async () => {
      const url = `/api/tournaments/${tournamentId}/results/gross?page=${currentPage}&limit=${rowsPerPage}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch gross results');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!tournamentId && activeTab === 'gross',
  });

  const isLoading = tournamentLoading || (activeTab === 'net' ? isNetLoading : isGrossLoading);
  const data = activeTab === 'net' ? pagedNetResults?.data : pagedGrossResults?.data;
  const totalRows = activeTab === 'net' ? pagedNetResults?.total ?? 0 : pagedGrossResults?.total ?? 0;

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-neutral-600">Loading tournament results...</p>
      </div>
    );
  }

  // Show error if tournament not found
  if (!tournament) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-neutral-600">Tournament not found</p>
      </div>
    );
  }

  // Cast tournament to expected type
  const tournamentObj = tournament as Tournament;

  // Show error if results not found
  if (!data || !Array.isArray(data)) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-neutral-600">No tournament results found</p>
      </div>
    );
  }

  // --- Table columns ---
  const getColumns = (
    handlePlayerClick: (id: number) => void,
    isGross: boolean
  ): Array<{
    accessorKey?: string;
    header: () => React.ReactNode;
    cell: (row: any, idx: number) => React.ReactNode;
  }> => [
    {
      accessorKey: "position",
      header: () => <span>Pos</span>,
      cell: (row, idx) => {
        // Use backend-calculated position and isTied fields
        return <span className="font-semibold">{row?.isTied ? `T${row?.position}` : row?.position}</span>;
      },
    },
    {
      accessorKey: "player",
      header: () => <span>Player</span>,
      cell: (row) => (
        <button
          className="text-primary underline font-semibold hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary px-1 py-0.5 rounded"
          onClick={() => handlePlayerClick(row?.player?.id)}
          tabIndex={0}
          aria-label={`View details for ${row?.player?.name}`}
        >
          {row?.player?.name || 'Unknown'}
        </button>
      ),
    },
    {
      accessorKey: "grossScore",
      header: () => <span>Gross</span>,
      cell: (row) => <span className="text-center">{row?.grossScore !== null && row?.grossScore !== undefined ? row.grossScore : "N/A"}</span>,
    },
    {
      accessorKey: "netScore",
      header: () => <span>Net</span>,
      cell: (row) => <span className="text-center">{row?.netScore !== null && row?.netScore !== undefined ? row.netScore : "N/A"}</span>,
    },
    {
      accessorKey: "handicap",
      header: () => <span>Handicap</span>,
      cell: (row) => <span className="text-center">{row?.handicap !== null && row?.handicap !== undefined ? row.handicap : "N/A"}</span>,
    },
    {
      accessorKey: "points",
      header: () => <span>Points</span>,
      cell: (row) => <span className="text-right font-semibold">{isGross ? (row?.grossPoints || 0) : (row?.points || 0)}</span>,
    },
  ];

  const handlePlayerClick = (id: number) => {
    setSelectedPlayerId(id);
    setIsPlayerDetailsOpen(true);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-heading font-bold">{tournamentObj.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-neutral-600">{tournamentObj.date ? format(new Date(tournamentObj.date), 'MMM d, yyyy') : ''}</p>
            {tournamentObj.type && (
              <Badge variant={tournamentObj.type as any}>{getTournamentTypeLabel(tournamentObj.type)}</Badge>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={() => window.history.back()}>Back</Button>
      </div>

      {/* Tab navigation */}
      <div className="flex space-x-1 p-1 bg-gray-100 rounded-lg max-w-fit">
        <button
          onClick={() => { setActiveTab("net"); setCurrentPage(0); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "net"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          Net
        </button>
        <button
          onClick={() => { setActiveTab("gross"); setCurrentPage(0); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "gross"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          Gross
        </button>
      </div>

      <Separator />

      {/* NET Leaderboard */}
      {activeTab === "net" && (
        <Card>
          <CardHeader>
            <CardTitle>Net Leaderboard</CardTitle>
            <CardDescription>
              Net score leaderboard ordered by backend-calculated position. Points based on tournament type ({tournamentObj.type}).
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto scrollbar-thin scrollbar-thumb-rounded bg-white p-0">
            <div className="min-w-[600px]">
              <table className="w-full text-sm text-left border-separate border-spacing-0">
                <thead className="bg-neutral-100 sticky top-0 z-10">
                  <tr>
                    {getColumns(handlePlayerClick, false).map((col, idx) => (
                      <th
                        key={col.accessorKey || idx}
                        className="py-2 pl-4 pr-2 font-semibold text-neutral-700 min-w-[48px] text-left sticky left-0 bg-neutral-100 z-20"
                      >
                        {col.header()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {isLoading ? (
                    Array(10).fill(0).map((_, rowIdx) => (
                      <tr key={rowIdx}>
                        {getColumns(handlePlayerClick, false).map((col, colIdx) => (
                          <td key={col.accessorKey || colIdx} className="py-2 pl-4 pr-2">
                            <Skeleton className="h-5 w-20" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    data.map((result: any, index: number) => (
                      <tr key={result?.id || 'unknown'}>
                        {getColumns(handlePlayerClick, false).map((col, colIdx) => (
                          <td
                            key={col.accessorKey || colIdx}
                            className={
                              colIdx === 0
                                ? "font-semibold pl-4 pr-2"
                                : colIdx === 1
                                ? ""
                                : colIdx === 5
                                ? "text-right font-semibold"
                                : "text-center"
                            }
                          >
                            {col.cell(result, index)}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination controls */}
            <div className="flex justify-between items-center mt-4 px-4">
              <span className="text-sm text-neutral-600">
                Page {currentPage + 1} of {Math.ceil(totalRows / rowsPerPage)} ({totalRows} players)
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setCurrentPage(0)} disabled={currentPage === 0}>First</Button>
                <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}>Prev</Button>
                <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalRows / rowsPerPage) - 1, p + 1))} disabled={currentPage >= Math.ceil(totalRows / rowsPerPage) - 1}>Next</Button>
                <Button size="sm" variant="outline" onClick={() => setCurrentPage(Math.ceil(totalRows / rowsPerPage) - 1)} disabled={currentPage >= Math.ceil(totalRows / rowsPerPage) - 1}>Last</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* GROSS Leaderboard */}
      {activeTab === "gross" && (
        <Card>
          <CardHeader>
            <CardTitle>Gross Leaderboard</CardTitle>
            <CardDescription>
              Gross score leaderboard showing stored gross points from database.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto scrollbar-thin scrollbar-thumb-rounded bg-white p-0">
            <div className="min-w-[600px]">
              <table className="w-full text-sm text-left border-separate border-spacing-0">
                <thead className="bg-neutral-100 sticky top-0 z-10">
                  <tr>
                    {getColumns(handlePlayerClick, true).map((col, idx) => (
                      <th
                        key={col.accessorKey || idx}
                        className="py-2 pl-4 pr-2 font-semibold text-neutral-700 min-w-[48px] text-left sticky left-0 bg-neutral-100 z-20"
                      >
                        {col.header()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {isLoading ? (
                    Array(10).fill(0).map((_, rowIdx) => (
                      <tr key={rowIdx}>
                        {getColumns(handlePlayerClick, true).map((col, colIdx) => (
                          <td key={col.accessorKey || colIdx} className="py-2 pl-4 pr-2">
                            <Skeleton className="h-5 w-20" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    data.map((result: any, index: number) => (
                      <tr key={result?.id || 'unknown'}>
                        {getColumns(handlePlayerClick, true).map((col, colIdx) => (
                          <td
                            key={col.accessorKey || colIdx}
                            className={
                              colIdx === 0
                                ? "font-semibold pl-4 pr-2"
                                : colIdx === 1
                                ? ""
                                : colIdx === 5
                                ? "text-right font-semibold"
                                : "text-center"
                            }
                          >
                            {col.cell(result, index)}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination controls */}
            <div className="flex justify-between items-center mt-4 px-4">
              <span className="text-sm text-neutral-600">
                Page {currentPage + 1} of {Math.ceil(totalRows / rowsPerPage)} ({totalRows} players)
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setCurrentPage(0)} disabled={currentPage === 0}>First</Button>
                <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}>Prev</Button>
                <Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalRows / rowsPerPage) - 1, p + 1))} disabled={currentPage >= Math.ceil(totalRows / rowsPerPage) - 1}>Next</Button>
                <Button size="sm" variant="outline" onClick={() => setCurrentPage(Math.ceil(totalRows / rowsPerPage) - 1)} disabled={currentPage >= Math.ceil(totalRows / rowsPerPage) - 1}>Last</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Player Details Modal */}
      <PlayerDetailsModal
        playerId={selectedPlayerId}
        isOpen={isPlayerDetailsOpen}
        onClose={() => setIsPlayerDetailsOpen(false)}
      />
    </div>
  );
}