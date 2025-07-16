import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { PlayerWithHistory, AppSettings } from "@shared/schema";
import PlayerDetailsModal from "@/components/custom/PlayerDetailsModal";

export default function Leaderboards() {
  const { toast } = useToast();
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [isPlayerDetailsOpen, setIsPlayerDetailsOpen] = useState(false);
  const [sortingKey, setSortingKey] = useState<string>('rank');
  const [sortingDesc, setSortingDesc] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('net');
  const [currentPage, setCurrentPage] = useState(0);
  const rowsPerPage = 25;

  // Fetch app settings to get custom page title
  const { data: appSettings } = useQuery<AppSettings>({
    queryKey: ["/api/settings"],
  });

  // Fetch leaderboard data with server-side pagination
  const {
    data: pagedNetLeaderboard,
    isLoading: isNetLoading,
    error: netError
  } = useQuery<{ data: PlayerWithHistory[]; total: number }>({
    queryKey: ["/api/leaderboard/net", { page: currentPage, limit: rowsPerPage }],
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === "net",
    // Add queryFn for clarity and debugging
    queryFn: async () => {
      const url = `/api/leaderboard/net?page=${currentPage}&limit=${rowsPerPage}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch net leaderboard');
      return response.json();
    },
  });
  const {
    data: pagedGrossLeaderboard,
    isLoading: isGrossLoading,
    error: grossError
  } = useQuery<{ data: PlayerWithHistory[]; total: number }>({
    queryKey: ["/api/leaderboard/gross", { page: currentPage, limit: rowsPerPage }],
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === "gross",
    queryFn: async () => {
      const url = `/api/leaderboard/gross?page=${currentPage}&limit=${rowsPerPage}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch gross leaderboard');
      return response.json();
    },
  });

  // Use the appropriate data source based on active tab
  const data = activeTab === "net" ? pagedNetLeaderboard?.data : pagedGrossLeaderboard?.data;
  const totalRows = activeTab === "net" ? pagedNetLeaderboard?.total ?? 0 : pagedGrossLeaderboard?.total ?? 0;
  const isLoading = activeTab === "net" ? isNetLoading : isGrossLoading;
  const error = activeTab === "net" ? netError : grossError;

  const handleSort = (key: string) => {
    if (sortingKey === key) {
      setSortingDesc(!sortingDesc);
    } else {
      setSortingKey(key);
      setSortingDesc(false);
    }
  };

  const handlePlayerClick = (id: number) => {
    setSelectedPlayerId(id);
    setIsPlayerDetailsOpen(true);
  };

  // --- Column sort indicator helper ---
  const SortIndicator = ({ isSorted, isSortedDesc }: { isSorted: boolean, isSortedDesc: boolean }) => (
    isSorted ? (
      <span className="ml-1 inline-block align-middle">
        {isSortedDesc ? '▼' : '▲'}
      </span>
    ) : null
  );

  // --- Table columns ---
  const getColumns = (
    handleSortFn: (key: string) => void,
    sortingKeyVal: string,
    sortingDescVal: boolean,
    handlePlayerClick: (id: number) => void,
    activeTab: string
  ): Array<{
    accessorKey?: string;
    header: () => React.ReactNode;
    cell: (row: PlayerWithHistory) => React.ReactNode;
  }> => {
    const playerCell = (row: PlayerWithHistory) => (
      <button
        className="text-primary underline font-semibold hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary px-1 py-0.5 rounded"
        onClick={() => handlePlayerClick(row.player.id)}
        tabIndex={0}
        aria-label={`View details for ${row.player.name}`}
      >
        {row.player.name}
      </button>
    );

    const baseColumns = [
      {
        accessorKey: "rank",
        header: () => (
          <button
            className="flex items-center w-full px-2 py-1 font-semibold text-neutral-700 bg-transparent hover:bg-neutral-200 rounded focus:outline-none"
            onClick={() => handleSortFn('rank')}
          >
            Pos
            <SortIndicator isSorted={sortingKeyVal === 'rank'} isSortedDesc={sortingDescVal} />
          </button>
        ),
        cell: (row: PlayerWithHistory) => <div className="font-medium text-center min-w-[48px]">{row.rank}</div>,
      },
      {
        accessorKey: "player.name",
        header: () => (
          <button
            className="flex items-center w-full px-2 py-1 font-semibold text-neutral-700 bg-transparent hover:bg-neutral-200 rounded focus:outline-none"
            onClick={() => handleSortFn('player.name')}
          >
            Player
            <SortIndicator isSorted={sortingKeyVal === 'player.name'} isSortedDesc={sortingDescVal} />
          </button>
        ),
        cell: playerCell,
      },
      {
        accessorKey: "majorPoints",
        header: () => (
          <button
            className="flex items-center w-full px-2 py-1 font-semibold text-neutral-700 bg-transparent hover:bg-neutral-200 rounded focus:outline-none"
            onClick={() => handleSortFn('majorPoints')}
          >
            Major
            <SortIndicator isSorted={sortingKeyVal === 'majorPoints'} isSortedDesc={sortingDescVal} />
          </button>
        ),
        cell: (row: PlayerWithHistory) => <div className="text-center min-w-[60px]">{row.majorPoints?.toLocaleString() ?? 0}</div>,
      },
    ];

    if (activeTab === "net") {
      const rankAndPlayerColumns = baseColumns.slice(0, 2);
      const overallPointsColumn = {
        accessorKey: "top8TotalPoints",
        header: () => (
          <button
            className="flex items-center w-full px-2 py-1 font-semibold text-neutral-700 bg-transparent hover:bg-neutral-200 rounded focus:outline-none"
            onClick={() => handleSortFn('top8TotalPoints')}
          >
            Overall Points
            <SortIndicator isSorted={sortingKeyVal === 'top8TotalPoints'} isSortedDesc={sortingDescVal} />
          </button>
        ),
        cell: (row: PlayerWithHistory) => <div className="font-bold text-right min-w-[80px]">{(row.top8TotalPoints || 0).toLocaleString()}</div>,
        enableSorting: true,
      };
      const eventsColumn = {
        accessorKey: "totalEvents",
        header: () => (
          <button
            className="flex items-center w-full px-2 py-1 font-semibold text-neutral-700 bg-transparent hover:bg-neutral-200 rounded focus:outline-none"
            onClick={() => handleSortFn('totalEvents')}
          >
            Events
            <SortIndicator isSorted={sortingKeyVal === 'totalEvents'} isSortedDesc={sortingDescVal} />
          </button>
        ),
        cell: (row: PlayerWithHistory) => <div className="text-center min-w-[60px]">{row.totalEvents}</div>,
        enableSorting: true,
        size: 80,
      };
      const remainingColumns = baseColumns.slice(2);
      return [
        ...rankAndPlayerColumns,
        overallPointsColumn,
        eventsColumn,
        ...remainingColumns,
        {
          accessorKey: "tourPoints",
          header: () => (
            <button
              className="flex items-center w-full px-2 py-1 font-semibold text-neutral-700 bg-transparent hover:bg-neutral-200 rounded focus:outline-none"
              onClick={() => handleSortFn('tourPoints')}
            >
              Tour
              <SortIndicator isSorted={sortingKeyVal === 'tourPoints'} isSortedDesc={sortingDescVal} />
            </button>
          ),
          cell: (row: PlayerWithHistory) => <div className="text-center min-w-[60px]">{row.tourPoints?.toLocaleString() ?? 0}</div>,
          enableSorting: true,
          size: 80,
        },
        {
          accessorKey: "leaguePoints",
          header: () => (
            <button
              className="flex items-center w-full px-2 py-1 font-semibold text-neutral-700 bg-transparent hover:bg-neutral-200 rounded focus:outline-none"
              onClick={() => handleSortFn('leaguePoints')}
            >
              League
              <SortIndicator isSorted={sortingKeyVal === 'leaguePoints'} isSortedDesc={sortingDescVal} />
            </button>
          ),
          cell: (row: PlayerWithHistory) => <div className="text-center min-w-[60px]">{row.leaguePoints?.toLocaleString() ?? 0}</div>,
          enableSorting: true,
        },
        {
          accessorKey: "suprPoints",
          header: () => (
            <button
              className="flex items-center w-full px-2 py-1 font-semibold text-neutral-700 bg-transparent hover:bg-neutral-200 rounded focus:outline-none"
              onClick={() => handleSortFn('suprPoints')}
            >
              SUPR
              <SortIndicator isSorted={sortingKeyVal === 'suprPoints'} isSortedDesc={sortingDescVal} />
            </button>
          ),
          cell: (row: PlayerWithHistory) => <div className="text-center min-w-[60px]">{row.suprPoints?.toLocaleString() ?? 0}</div>,
          enableSorting: true,
          size: 80,
        },
      ];
    } else {
      const rankAndPlayerColumns = baseColumns.slice(0, 2);
      const overallPointsColumn = {
        accessorKey: "grossTop8TotalPoints",
        header: () => (
          <button
            className="flex items-center w-full px-2 py-1 font-semibold text-neutral-700 bg-transparent hover:bg-neutral-200 rounded focus:outline-none"
            onClick={() => handleSortFn('grossTop8TotalPoints')}
          >
            Overall Points
            <SortIndicator isSorted={sortingKeyVal === 'grossTop8TotalPoints'} isSortedDesc={sortingDescVal} />
          </button>
        ),
        cell: (row: PlayerWithHistory) => <div className="font-bold text-right min-w-[80px]">{(row.grossTop8TotalPoints || 0).toLocaleString()}</div>,
        enableSorting: true,
      };
      const eventsColumn = {
        accessorKey: "totalEvents",
        header: () => (
          <button
            className="flex items-center w-full px-2 py-1 font-semibold text-neutral-700 bg-transparent hover:bg-neutral-200 rounded focus:outline-none"
            onClick={() => handleSortFn('totalEvents')}
          >
            Events
            <SortIndicator isSorted={sortingKeyVal === 'totalEvents'} isSortedDesc={sortingDescVal} />
          </button>
        ),
        cell: (row: PlayerWithHistory) => <div className="text-center min-w-[60px]">{row.totalEvents}</div>,
        enableSorting: true,
      };
      const remainingColumns = baseColumns.slice(2);
      return [
        ...rankAndPlayerColumns,
        overallPointsColumn,
        eventsColumn,
        ...remainingColumns,
        {
          accessorKey: "grossTourPoints",
          header: () => (
            <button
              className="flex items-center w-full px-2 py-1 font-semibold text-neutral-700 bg-transparent hover:bg-neutral-200 rounded focus:outline-none"
              onClick={() => handleSortFn('grossTourPoints')}
            >
              Tour
              <SortIndicator isSorted={sortingKeyVal === 'grossTourPoints'} isSortedDesc={sortingDescVal} />
            </button>
          ),
          cell: (row: PlayerWithHistory) => <div className="text-center min-w-[60px]">{row.grossTourPoints?.toLocaleString() ?? 0}</div>,
          enableSorting: true,
        },
        {
          accessorKey: "leaguePoints",
          header: () => (
            <button
              className="flex items-center w-full px-2 py-1 font-semibold text-neutral-700 bg-transparent hover:bg-neutral-200 rounded focus:outline-none"
              onClick={() => handleSortFn('leaguePoints')}
            >
              League
              <SortIndicator isSorted={sortingKeyVal === 'leaguePoints'} isSortedDesc={sortingDescVal} />
            </button>
          ),
          cell: (row: PlayerWithHistory) => <div className="text-center min-w-[60px]">{row.leaguePoints?.toLocaleString() ?? 0}</div>,
          enableSorting: true,
        },
        {
          accessorKey: "suprPoints",
          header: () => (
            <button
              className="flex items-center w-full px-2 py-1 font-semibold text-neutral-700 bg-transparent hover:bg-neutral-200 rounded focus:outline-none"
              onClick={() => handleSortFn('suprPoints')}
            >
              SUPR
              <SortIndicator isSorted={sortingKeyVal === 'suprPoints'} isSortedDesc={sortingDescVal} />
            </button>
          ),
          cell: (row: PlayerWithHistory) => <div className="text-center min-w-[60px]">{row.suprPoints?.toLocaleString() ?? 0}</div>,
          enableSorting: true,
        },
      ];
    }
  };

  const columns = useMemo(
    () => getColumns(handleSort, sortingKey, sortingDesc, handlePlayerClick, activeTab),
    [handleSort, sortingKey, sortingDesc, handlePlayerClick, activeTab]
  );

  // --- Export to CSV ---
  const exportToCSV = () => {
    if (!data) return;
    const isGross = activeTab === "gross";
    const headers = isGross
      ? ['Rank', 'Player', 'Gross Points', 'Gross Tour Points', 'League Points', 'SUPR Points', 'Events']
      : ['Rank', 'Player', 'Major Points', 'Tour Points', 'League Points', 'SUPR Points', 'Events', 'Total Points'];
    const rows = data.map(player => isGross
      ? [
          player.rank,
          player.player.name,
          player.grossTotalPoints || 0,
          player.grossTourPoints || 0,
          player.leaguePoints || 0,
          player.suprPoints || 0,
          player.totalEvents || 0
        ]
      : [
          player.rank,
          player.player.name,
          player.majorPoints || 0,
          player.tourPoints || 0,
          player.leaguePoints || 0,
          player.suprPoints || 0,
          player.totalEvents || 0,
          player.totalPoints || 0
        ]
    );
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeTab}-leaderboard-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Export successful",
      description: `${activeTab.toUpperCase()} leaderboard has been exported to CSV`,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // --- Tab change handler: reset page to 0 when switching tabs ---
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(0);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-neutral-800">{appSettings?.pageTitle || "Overall Leaderboard"}</h1>
          <p className="text-neutral-600">Season standings and player performance</p>
        </div>
        {/* Tab selection buttons */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full md:w-auto">
          <TabsList className="grid grid-cols-2 w-full md:w-[300px]">
            <TabsTrigger value="net" aria-current={activeTab === 'net'}>Net Leaderboard</TabsTrigger>
            <TabsTrigger value="gross" aria-current={activeTab === 'gross'}>Gross Leaderboard</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {/* Leaderboard info section */}
      <div className="flex items-center text-sm text-neutral-700 mb-4 bg-neutral-50 p-3 rounded-md">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-primary" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-4 5a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span>Click on any player to view their tournament history</span>
        <span className="sr-only" aria-live="polite">{isLoading ? 'Loading leaderboard data...' : ''}</span>
      </div>
      {/* Error handling */}
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4" role="alert">
          <span className="font-semibold">Error loading leaderboard:</span> {error.message}
        </div>
      )}
      {/* Fixed tab navigation at bottom of screen */}
      <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center">
        <div className="bg-white rounded-full shadow-lg border px-4 py-3">
          <div className="flex space-x-2">
            <button
              onClick={() => handleTabChange("net")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                activeTab === "net" 
                  ? "bg-primary text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              aria-current={activeTab === 'net'}
            >
              Net
            </button>
            <button
              onClick={() => handleTabChange("gross")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                activeTab === "gross" 
                  ? "bg-primary text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              aria-current={activeTab === 'gross'}
            >
              Gross
            </button>
          </div>
        </div>
      </div>
      {/* Leaderboard Table */}
      <Card className="mb-20" aria-busy={isLoading} aria-live="polite">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-rounded bg-white p-0">
          <div className="min-w-[900px]">
            <table className="w-full text-sm text-left border-separate border-spacing-0">
              <thead className="bg-neutral-100 sticky top-0 z-10">
                <tr>
                  {columns.map((col, idx) => (
                    <th
                      key={col.accessorKey || idx}
                      className="py-3 px-4 font-semibold text-neutral-700 text-left min-w-[80px] whitespace-nowrap sticky top-0 bg-neutral-100 z-10 border-b border-neutral-200"
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
                      {columns.map((col, colIdx) => (
                        <td key={col.accessorKey || colIdx} className="py-3 px-4 min-w-[80px] text-left align-middle">
                          <Skeleton className="h-5 w-24" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  data?.map((row, rowIdx) => (
                    <tr key={row.player.id || rowIdx} className="hover:bg-neutral-50 transition-colors">
                      {columns.map((col, colIdx) => (
                        <td
                          key={col.accessorKey || colIdx}
                          className="py-3 px-4 min-w-[80px] text-left align-middle"
                        >
                          {col.cell(row)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* Pagination controls */}
        <div className="flex justify-between items-center mt-4 px-4 z-10 relative">
          <span className="text-sm text-neutral-600">
            Page {currentPage + 1} of {Math.ceil(totalRows / rowsPerPage)} ({totalRows} players)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className={`px-3 py-1 rounded border text-sm font-medium transition-colors ${currentPage === 0 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-primary'}`}
              aria-label="First page"
              onClick={() => setCurrentPage(0)}
              disabled={currentPage === 0}
            >
              First
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded border text-sm font-medium transition-colors ${currentPage === 0 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-primary'}`}
              aria-label="Previous page"
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              Prev
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded border text-sm font-medium transition-colors ${currentPage >= Math.ceil(totalRows / rowsPerPage) - 1 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-primary'}`}
              aria-label="Next page"
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalRows / rowsPerPage) - 1, p + 1))}
              disabled={currentPage >= Math.ceil(totalRows / rowsPerPage) - 1}
            >
              Next
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded border text-sm font-medium transition-colors ${currentPage >= Math.ceil(totalRows / rowsPerPage) - 1 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-primary'}`}
              aria-label="Last page"
              onClick={() => setCurrentPage(Math.ceil(totalRows / rowsPerPage) - 1)}
              disabled={currentPage >= Math.ceil(totalRows / rowsPerPage) - 1}
            >
              Last
            </button>
          </div>
        </div>
      </Card>
      {/* Player Details Modal */}
      <PlayerDetailsModal
        playerId={selectedPlayerId}
        isOpen={isPlayerDetailsOpen}
        onClose={() => setIsPlayerDetailsOpen(false)}
      />
    </section>
  );
}
