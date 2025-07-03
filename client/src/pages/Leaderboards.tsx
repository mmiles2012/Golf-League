import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import type { PlayerWithHistory, AppSettings } from "@shared/schema";
import PlayerDetailsModal from "@/components/custom/PlayerDetailsModal";
import { FileDown, Printer } from "lucide-react";
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table';

export default function Leaderboards() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("net");
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [isPlayerDetailsOpen, setIsPlayerDetailsOpen] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [page, setPage] = useState(0);
  const rowsPerPage = 25;

  // Fetch app settings to get custom page title
  const { data: appSettings } = useQuery<AppSettings>({
    queryKey: ["/api/settings"],
  });
  
  // Fetch both leaderboard types simultaneously for faster tab switching
  const { data: netLeaderboardData, isLoading: isNetLoading } = useQuery<PlayerWithHistory[]>({
    queryKey: [`/api/leaderboard/net`],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const { data: grossLeaderboardData, isLoading: isGrossLoading } = useQuery<PlayerWithHistory[]>({
    queryKey: [`/api/leaderboard/gross`],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Use the appropriate data source based on active tab
  const leaderboardData = activeTab === "net" ? netLeaderboardData : grossLeaderboardData;
  const isLoading = activeTab === "net" ? isNetLoading : isGrossLoading;

  // Diagnostic: log a sample row and total count
  if (leaderboardData && leaderboardData.length > 0) {
    console.log("Sample leaderboard row:", leaderboardData[0]);
    console.log("Total leaderboard rows:", leaderboardData.length);
  }
  
  const handlePlayerClick = (playerId: number) => {
    setSelectedPlayerId(playerId);
    setIsPlayerDetailsOpen(true);
  };
  
  const exportToCSV = () => {
    if (!leaderboardData) return;
    
    // Create CSV content
    const isGross = activeTab === "gross";
    const headers = isGross
      ? ['Rank', 'Player', 'Gross Points', 'Gross Tour Points', 'League Points', 'SUPR Points', 'Events']
      : ['Rank', 'Player', 'Major Points', 'Tour Points', 'League Points', 'SUPR Points', 'Events', 'Total Points'];
    
    const rows = leaderboardData.map(player => isGross
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
    
    // Create and download file
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
  
  // Define columns for DataTable
  const getColumns = (): ColumnDef<PlayerWithHistory>[] => {
    // Base columns that exclude Events as it will be positioned near Total Points
    const baseColumns: ColumnDef<PlayerWithHistory>[] = [
      {
        accessorKey: "rank",
        header: "Pos",
        cell: ({ row }) => <div className="font-medium">{row.original.rank}</div>,
        size: 60,
      },
      {
        accessorKey: "player.name",
        header: "Player",
        cell: ({ row }) => <div className="font-medium">{row.original.player.name}</div>,
        enableSorting: true,
      },
      {
        accessorKey: "majorPoints",
        header: "Major",
        cell: ({ row }) => <div className="text-center">{row.original.majorPoints.toLocaleString()}</div>,
        enableSorting: true,
        size: 80,
      },
    ];
    
    if (activeTab === "net") {
      const rankAndPlayerColumns = baseColumns.slice(0, 2);
      const overallPointsColumn: ColumnDef<PlayerWithHistory> = {
        accessorKey: "top8TotalPoints",
        header: "Overall Points",
        cell: ({ row }) => <div className="font-bold text-right">{(row.original.top8TotalPoints || 0).toLocaleString()}</div>,
        enableSorting: true,
      };
      const eventsColumn: ColumnDef<PlayerWithHistory> = {
        accessorKey: "totalEvents",
        header: "Events",
        cell: ({ row }) => <div className="text-center">{row.original.totalEvents}</div>,
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
          header: "Tour",
          cell: ({ row }) => <div className="text-center">{row.original.tourPoints.toLocaleString()}</div>,
          enableSorting: true,
          size: 80,
        },
        {
          accessorKey: "leaguePoints",
          header: "League",
          cell: ({ row }) => <div className="text-center">{row.original.leaguePoints.toLocaleString()}</div>,
          enableSorting: true,
        },
        {
          accessorKey: "suprPoints",
          header: "SUPR",
          cell: ({ row }) => <div className="text-center">{row.original.suprPoints.toLocaleString()}</div>,
          enableSorting: true,
          size: 80,
        },
      ];
    } else {
      const rankAndPlayerColumns = baseColumns.slice(0, 2);
      const overallPointsColumn: ColumnDef<PlayerWithHistory> = {
        accessorKey: "grossTop8TotalPoints",
        header: "Overall Points",
        cell: ({ row }) => <div className="font-bold text-right">{(row.original.grossTop8TotalPoints || 0).toLocaleString()}</div>,
        enableSorting: true,
      };
      const eventsColumn: ColumnDef<PlayerWithHistory> = {
        accessorKey: "totalEvents",
        header: "Events",
        cell: ({ row }) => <div className="text-center">{row.original.totalEvents}</div>,
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
          header: "Tour",
          cell: ({ row }) => <div className="text-center">{(row.original.grossTourPoints || 0).toLocaleString()}</div>,
          enableSorting: true,
        },
        {
          accessorKey: "leaguePoints",
          header: "League",
          cell: ({ row }) => <div className="text-center">{row.original.leaguePoints.toLocaleString()}</div>,
          enableSorting: true,
        },
        {
          accessorKey: "suprPoints",
          header: "SUPR",
          cell: ({ row }) => <div className="text-center">{row.original.suprPoints.toLocaleString()}</div>,
          enableSorting: true,
        },
      ];
    }
  }
  
  const columns = getColumns();

  // Memoize sorted data if sorting is needed (optional, can be removed if not needed)
  const sortedData = useMemo(() => {
    if (!leaderboardData) return [];
    // Optionally, implement sorting here if needed
    return leaderboardData;
  }, [leaderboardData]);

  // Pagination logic
  const totalRows = sortedData.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const paginatedRows = sortedData.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-neutral-800">{appSettings?.pageTitle || "Overall Leaderboard"}</h1>
          <p className="text-neutral-600">Season standings and player performance</p>
        </div>
        
        {/* Tab selection buttons */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList className="grid grid-cols-2 w-full md:w-[300px]">
            <TabsTrigger value="net">Net Leaderboard</TabsTrigger>
            <TabsTrigger value="gross">Gross Leaderboard</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Leaderboard info section */}
      <div className="flex items-center text-sm text-neutral-700 mb-4 bg-neutral-50 p-3 rounded-md">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-primary" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-4 5a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span>Click on any player to view their tournament history</span>
      </div>
      
      {/* Fixed tab navigation at bottom of screen */}
      <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center">
        <div className="bg-white rounded-full shadow-lg border px-4 py-3">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab("net")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                activeTab === "net" 
                  ? "bg-primary text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Net
            </button>
            <button
              onClick={() => setActiveTab("gross")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                activeTab === "gross" 
                  ? "bg-primary text-white" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Gross
            </button>
          </div>
        </div>
      </div>
      
      {/* Leaderboard Table */}
      <Card className="mb-20">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-rounded bg-white p-0">
          <div className="min-w-[700px]">
            <table className="w-full text-sm text-left border-separate border-spacing-0">
              <thead className="bg-neutral-100 sticky top-0 z-10">
                <tr>
                  {columns.map((col, idx) => (
                    <th key={col.accessorKey || idx} className="py-2 px-3 font-semibold text-neutral-700 text-left min-w-[80px] whitespace-nowrap sticky top-0 bg-neutral-100 z-10">
                      {typeof col.header === 'function' ? col.header({ column: col }) : col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {paginatedRows.map((row, rowIdx) => (
                  <tr key={row.player.id || rowIdx}>
                    {columns.map((col, colIdx) => (
                      <td key={col.accessorKey || colIdx} className="py-2 px-3">
                        {typeof col.cell === 'function'
                          ? col.cell({ row: { original: row } })
                          : row[col.accessorKey as keyof typeof row]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Pagination controls */}
        <div className="flex justify-between items-center mt-4 px-4">
          <span className="text-sm text-neutral-600">
            Page {page + 1} of {totalPages} ({totalRows} players)
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage(0)} disabled={page === 0}>First</Button>
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Prev</Button>
            <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next</Button>
            <Button size="sm" variant="outline" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>Last</Button>
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
