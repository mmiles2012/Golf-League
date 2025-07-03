import { useState } from "react";
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
        header: ({ column }) => {
          // Remove sorting UI if column.getIsSorted is not a function
          return (
            <div className="flex items-center cursor-pointer select-none">
              Player
            </div>
          );
        },
        cell: ({ row }) => <div className="font-medium">{row.original.player.name}</div>,
        enableSorting: true,
      },
      {
        accessorKey: "majorPoints",
        header: ({ column }) => {
          // Remove sorting UI if column.getIsSorted is not a function
          return (
            <div className="flex items-center justify-center cursor-pointer select-none">
              Major
            </div>
          );
        },
        cell: ({ row }) => <div className="text-center">{row.original.majorPoints.toLocaleString()}</div>,
        enableSorting: true,
        size: 80,
      },
    ];
    
    // Columns specific to net leaderboard
    if (activeTab === "net") {
      // Create a new array with "Total Points" column right after player name
      const rankAndPlayerColumns = baseColumns.slice(0, 2); // Take rank and player columns
      
      // Overall Points column (using top 8 points)
      const overallPointsColumn: ColumnDef<PlayerWithHistory> = {
        accessorKey: "top8TotalPoints",
        header: ({ column }) => {
          return (
            <div 
              className="flex items-center justify-end cursor-pointer select-none"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Overall Points
              {column.getIsSorted() === "asc" ? (
                <span className="ml-1">▲</span>
              ) : column.getIsSorted() === "desc" ? (
                <span className="ml-1">▼</span>
              ) : null}
            </div>
          )
        },
        cell: ({ row }) => <div className="font-bold text-right">{(row.original.top8TotalPoints || 0).toLocaleString()}</div>,
        enableSorting: true,
      };
      
      // Events column (moved next to Total Points)
      const eventsColumn: ColumnDef<PlayerWithHistory> = {
        accessorKey: "totalEvents",
        header: ({ column }) => {
          return (
            <div 
              className="flex items-center justify-center cursor-pointer select-none"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Events
              {column.getIsSorted() === "asc" ? (
                <span className="ml-1">▲</span>
              ) : column.getIsSorted() === "desc" ? (
                <span className="ml-1">▼</span>
              ) : null}
            </div>
          )
        },
        cell: ({ row }) => <div className="text-center">{row.original.totalEvents}</div>,
        enableSorting: true,
        size: 80,
      };
      
      const remainingColumns = baseColumns.slice(2); // Get the remaining columns (Major Points)
      

      return [
        ...rankAndPlayerColumns, // Rank, Player Name
        overallPointsColumn, // Overall Points (top 8) right after player name
        eventsColumn, // Events right after Overall Points
        ...remainingColumns, // Major Points
        {
          accessorKey: "tourPoints",
          header: ({ column }) => {
            return (
              <div 
                className="flex items-center justify-center cursor-pointer select-none"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              >
                Tour
                {column.getIsSorted() === "asc" ? (
                  <span className="ml-1">▲</span>
                ) : column.getIsSorted() === "desc" ? (
                  <span className="ml-1">▼</span>
                ) : null}
              </div>
            )
          },
          cell: ({ row }) => <div className="text-center">{row.original.tourPoints.toLocaleString()}</div>,
          enableSorting: true,
          size: 80,
        },
        {
          accessorKey: "leaguePoints",
          header: ({ column }) => {
            return (
              <div 
                className="flex items-center justify-center cursor-pointer select-none"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              >
                League
                {column.getIsSorted() === "asc" ? (
                  <span className="ml-1">▲</span>
                ) : column.getIsSorted() === "desc" ? (
                  <span className="ml-1">▼</span>
                ) : null}
              </div>
            )
          },
          cell: ({ row }) => <div className="text-center">{row.original.leaguePoints.toLocaleString()}</div>,
          enableSorting: true,
        },
        {
          accessorKey: "suprPoints",
          header: ({ column }) => {
            return (
              <div 
                className="flex items-center justify-center cursor-pointer select-none"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              >
                SUPR
                {column.getIsSorted() === "asc" ? (
                  <span className="ml-1">▲</span>
                ) : column.getIsSorted() === "desc" ? (
                  <span className="ml-1">▼</span>
                ) : null}
              </div>
            )
          },
          cell: ({ row }) => <div className="text-center">{row.original.suprPoints.toLocaleString()}</div>,
          enableSorting: true,
          size: 80,
        },
      ];
    } 
    // Columns specific to gross leaderboard
    else {
      // Create a new array with "Gross Points" column right after player name
      const rankAndPlayerColumns = baseColumns.slice(0, 2); // Take rank and player columns
      
      // Overall Points column (using gross top 8 points)
      const overallPointsColumn: ColumnDef<PlayerWithHistory> = {
        accessorKey: "grossTop8TotalPoints",
        header: ({ column }) => {
          return (
            <div 
              className="flex items-center justify-end cursor-pointer select-none"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Overall Points
              {column.getIsSorted() === "asc" ? (
                <span className="ml-1">▲</span>
              ) : column.getIsSorted() === "desc" ? (
                <span className="ml-1">▼</span>
              ) : null}
            </div>
          )
        },
        cell: ({ row }) => <div className="font-bold text-right">{(row.original.grossTop8TotalPoints || 0).toLocaleString()}</div>,
        enableSorting: true,
      };
      
      // Events column (moved next to Gross Points)
      const eventsColumn: ColumnDef<PlayerWithHistory> = {
        accessorKey: "totalEvents",
        header: ({ column }) => {
          return (
            <div 
              className="flex items-center justify-center cursor-pointer select-none"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Events
              {column.getIsSorted() === "asc" ? (
                <span className="ml-1">▲</span>
              ) : column.getIsSorted() === "desc" ? (
                <span className="ml-1">▼</span>
              ) : null}
            </div>
          )
        },
        cell: ({ row }) => <div className="text-center">{row.original.totalEvents}</div>,
        enableSorting: true,
      };
      
      const remainingColumns = baseColumns.slice(2); // Get the remaining columns (Major Points)
      

      return [
        ...rankAndPlayerColumns, // Rank, Player Name
        overallPointsColumn, // Overall Points (gross top 8) right after player name
        eventsColumn, // Events right after Overall Points
        ...remainingColumns, // Major Points
        {
          accessorKey: "grossTourPoints",
          header: ({ column }) => {
            return (
              <div 
                className="flex items-center justify-center cursor-pointer select-none"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              >
                Tour
                {column.getIsSorted() === "asc" ? (
                  <span className="ml-1">▲</span>
                ) : column.getIsSorted() === "desc" ? (
                  <span className="ml-1">▼</span>
                ) : (
                  <span className="ml-1 opacity-0 group-hover:opacity-100">▼</span>
                )}
              </div>
            )
          },
          cell: ({ row }) => <div className="text-center">{(row.original.grossTourPoints || 0).toLocaleString()}</div>,
          enableSorting: true,
        },
        {
          accessorKey: "leaguePoints",
          header: ({ column }) => {
            return (
              <div 
                className="flex items-center justify-center cursor-pointer select-none"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              >
                League
                {column.getIsSorted() === "asc" ? (
                  <span className="ml-1">▲</span>
                ) : column.getIsSorted() === "desc" ? (
                  <span className="ml-1">▼</span>
                ) : null}
              </div>
            )
          },
          cell: ({ row }) => <div className="text-center">{row.original.leaguePoints.toLocaleString()}</div>,
          enableSorting: true,
        },
        {
          accessorKey: "suprPoints",
          header: ({ column }) => {
            return (
              <div 
                className="flex items-center justify-center cursor-pointer select-none"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              >
                SUPR
                {column.getIsSorted() === "asc" ? (
                  <span className="ml-1">▲</span>
                ) : column.getIsSorted() === "desc" ? (
                  <span className="ml-1">▼</span>
                ) : null}
              </div>
            )
          },
          cell: ({ row }) => <div className="text-center">{row.original.suprPoints.toLocaleString()}</div>,
          enableSorting: true,
        }
      ];
    }
    
    // For gross leaderboard, return the base columns with totals column
    const rankAndPlayerColumns = baseColumns.slice(0, 2); // Take rank and player columns
    
    // Total Points column for gross leaderboard  
    const totalPointsColumn: ColumnDef<PlayerWithHistory> = {
      accessorKey: "totalPoints",
      header: ({ column }) => {
        return (
          <div 
            className="flex items-center justify-end cursor-pointer select-none"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Total Points
            {column.getIsSorted() === "asc" ? (
              <span className="ml-1">▲</span>
            ) : column.getIsSorted() === "desc" ? (
              <span className="ml-1">▼</span>
            ) : null}
          </div>
        )
      },
      cell: ({ row }) => <div className="font-bold text-right">{row.original.totalPoints.toLocaleString()}</div>,
      enableSorting: true,
    };
    
    // Events column
    const eventsColumn: ColumnDef<PlayerWithHistory> = {
      accessorKey: "totalEvents", 
      header: ({ column }) => {
        return (
          <div 
            className="flex items-center justify-center cursor-pointer select-none"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Events
            {column.getIsSorted() === "asc" ? (
              <span className="ml-1">▲</span>
            ) : column.getIsSorted() === "desc" ? (
              <span className="ml-1">▼</span>
            ) : null}
          </div>
        )
      },
      cell: ({ row }) => <div className="text-center">{row.original.totalEvents}</div>,
      enableSorting: true,
    };
    
    const remainingColumns = baseColumns.slice(2); // Get remaining columns starting from Major Points
    
    return [
      ...rankAndPlayerColumns, // Rank, Player Name
      totalPointsColumn, // Total Points right after player name  
      eventsColumn, // Events right after Total Points
      ...remainingColumns, // Major Points
      {
        accessorKey: "tourPoints",
        header: ({ column }) => {
          return (
            <div 
              className="flex items-center justify-center cursor-pointer select-none"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Tour
              {column.getIsSorted() === "asc" ? (
                <span className="ml-1">▲</span>
              ) : column.getIsSorted() === "desc" ? (
                <span className="ml-1">▼</span>
              ) : null}
            </div>
          )
        },
        cell: ({ row }) => <div className="text-center">{row.original.tourPoints.toLocaleString()}</div>,
        enableSorting: true,
      },
      {
        accessorKey: "leaguePoints",
        header: ({ column }) => {
          return (
            <div 
              className="flex items-center justify-center cursor-pointer select-none"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              League
              {column.getIsSorted() === "asc" ? (
                <span className="ml-1">▲</span>
              ) : column.getIsSorted() === "desc" ? (
                <span className="ml-1">▼</span>
              ) : null}
            </div>
          )
        },
        cell: ({ row }) => <div className="text-center">{row.original.leaguePoints.toLocaleString()}</div>,
        enableSorting: true,
      },
      {
        accessorKey: "suprPoints",
        header: ({ column }) => {
          return (
            <div 
              className="flex items-center justify-center cursor-pointer select-none"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              SUPR
              {column.getIsSorted() === "asc" ? (
                <span className="ml-1">▲</span>
              ) : column.getIsSorted() === "desc" ? (
                <span className="ml-1">▼</span>
              ) : null}
            </div>
          )
        },
        cell: ({ row }) => <div className="text-center">{row.original.suprPoints.toLocaleString()}</div>,
        enableSorting: true,
      }
    ];
  }
  
  const columns = getColumns();

  // Set up the table instance using useReactTable (v8+)
  const table = useReactTable({
    data: leaderboardData || [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: false,
    debugTable: false,
  });

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
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => {
                      const isSorted = header.column.getIsSorted?.();
                      return (
                        <th
                          key={header.id}
                          className="py-2 px-3 font-semibold text-neutral-700 text-left min-w-[80px] whitespace-nowrap sticky top-0 bg-neutral-100 z-10 cursor-pointer select-none"
                          onClick={header.column.getToggleSortingHandler?.()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {isSorted === 'asc' && <span className="ml-1">▲</span>}
                          {isSorted === 'desc' && <span className="ml-1">▼</span>}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="py-2 px-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
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
