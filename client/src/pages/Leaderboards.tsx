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
import type { PlayerWithHistory } from "@shared/schema";
import PlayerDetailsModal from "@/components/custom/PlayerDetailsModal";
import { FileDown, Printer } from "lucide-react";

export default function Leaderboards() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("net");
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [isPlayerDetailsOpen, setIsPlayerDetailsOpen] = useState(false);
  
  // Fetch leaderboard data based on active tab
  const { data: leaderboardData, isLoading } = useQuery<PlayerWithHistory[]>({
    queryKey: [`/api/leaderboard/${activeTab}`],
    staleTime: 60 * 1000, // 1 minute
  });
  
  const handlePlayerClick = (playerId: number) => {
    setSelectedPlayerId(playerId);
    setIsPlayerDetailsOpen(true);
  };
  
  const exportToCSV = () => {
    if (!leaderboardData) return;
    
    // Create CSV content
    const headers = ['Rank', 'Player', 'Major Points', 'Tour Points', 'League Points', 'SUPR Points', 'Events', 'Total Points'];
    
    const rows = leaderboardData.map(player => [
      player.rank,
      player.player.name,
      player.majorPoints,
      player.tourPoints,
      player.leaguePoints,
      player.suprPoints,
      player.totalEvents,
      player.totalPoints
    ]);
    
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
    // Base columns that are the same for both leaderboards
    const baseColumns: ColumnDef<PlayerWithHistory>[] = [
      {
        accessorKey: "rank",
        header: "Pos",
        cell: ({ row }) => <div className="font-medium">{row.original.rank}</div>,
      },
      {
        accessorKey: "player.name",
        header: ({ column }) => {
          return (
            <div 
              className="flex items-center cursor-pointer select-none"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Player
              {column.getIsSorted() === "asc" ? (
                <span className="ml-1">▲</span>
              ) : column.getIsSorted() === "desc" ? (
                <span className="ml-1">▼</span>
              ) : null}
            </div>
          )
        },
        cell: ({ row }) => <div className="font-medium">{row.original.player.name}</div>,
        enableSorting: true,
      },
      {
        accessorKey: "majorPoints",
        header: ({ column }) => {
          return (
            <div 
              className="flex items-center justify-center cursor-pointer select-none"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Major
              {column.getIsSorted() === "asc" ? (
                <span className="ml-1">▲</span>
              ) : column.getIsSorted() === "desc" ? (
                <span className="ml-1">▼</span>
              ) : null}
            </div>
          )
        },
        cell: ({ row }) => <div className="text-center">{row.original.majorPoints.toLocaleString()}</div>,
        enableSorting: true,
      },
      {
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
      },
    ];
    
    // Columns specific to net leaderboard
    if (activeTab === "net") {
      return [
        ...baseColumns,
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
        },
        {
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
        },
      ];
    } 
    // Columns specific to gross leaderboard
    else {
      return [
        ...baseColumns,
        {
          accessorKey: "grossTourPoints",
          header: ({ column }) => {
            return (
              <div 
                className="flex items-center justify-center cursor-pointer select-none"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              >
                Gross Tour
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
        },
        {
          accessorKey: "grossTotalPoints",
          header: ({ column }) => {
            return (
              <div 
                className="flex items-center justify-end cursor-pointer select-none"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              >
                Gross Points
                {column.getIsSorted() === "asc" ? (
                  <span className="ml-1">▲</span>
                ) : column.getIsSorted() === "desc" ? (
                  <span className="ml-1">▼</span>
                ) : null}
              </div>
            )
          },
          cell: ({ row }) => <div className="font-bold text-right">{(row.original.grossTotalPoints || 0).toLocaleString()}</div>,
          enableSorting: true,
        },
      ];
    }
  }
  
  const columns = getColumns();
  
  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-neutral-800">Leaderboards</h1>
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
      
      {/* Leaderboard Trophy Image */}
      <Card className="shadow-lg overflow-hidden">
        <div className="md:flex">
          <div className="md:flex-shrink-0">
            <img 
              src="https://images.unsplash.com/photo-1617396900799-f4ec2b43c7ae?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80" 
              alt="Golf tournament trophy" 
              className="h-48 w-full object-cover md:h-full md:w-60"
            />
          </div>
          <CardContent className="p-6">
            <h2 className="font-heading font-bold text-xl text-neutral-800">2023 Season Standings</h2>
            <p className="mt-2 text-neutral-600">
              {activeTab === "net" ? 
                "The Net Leaderboard shows season-long performance with handicap adjustments applied. Players earn points based on their finishing positions across different tournament types." : 
                "The Gross Leaderboard tracks performance without handicap adjustments. This represents the raw scoring ability of players across all tournaments."
              }
            </p>
            <div className="mt-4">
              <div className="flex items-center text-sm text-neutral-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-primary" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>Click on any player to view their tournament history</span>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
      
      {/* Leaderboard Table */}
      <Card>
        <div className="px-5 py-4 border-b border-neutral-200 flex justify-between items-center">
          <h3 className="font-heading font-bold text-lg">{activeTab === "net" ? "Net" : "Gross"} Leaderboard</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={isLoading || !leaderboardData}
              className="inline-flex items-center"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={isLoading || !leaderboardData}
              className="inline-flex items-center"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              {Array(10).fill(0).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <DataTable
              columns={columns}
              data={leaderboardData || []}
              rowClickHandler={(row) => handlePlayerClick(row.player.id)}
            />
          </div>
        )}
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
