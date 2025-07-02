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

export default function Leaderboards() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("net");
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [isPlayerDetailsOpen, setIsPlayerDetailsOpen] = useState(false);

  // Fetch app settings
  const { data: settings } = useQuery<AppSettings>({
    queryKey: ["/api/settings"],
  });

  // Fetch leaderboards
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
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `${activeTab}-leaderboard-${dateStr}.csv`);
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
  const netColumns: ColumnDef<PlayerWithHistory>[] = [
    {
      accessorKey: "rank",
      header: "Rank",
      cell: ({ row }) => {
        const rank = row.getValue("rank") as number;
        return (
          <div className="font-medium">
            {rank <= 3 ? (
              <Badge variant={rank === 1 ? "default" : rank === 2 ? "secondary" : "outline"}>
                {rank}
              </Badge>
            ) : (
              rank
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "player.name",
      header: "Player",
      cell: ({ row }) => {
        const player = row.original.player;
        return (
          <Button
            variant="link"
            className="p-0 h-auto font-medium text-left justify-start"
            onClick={() => handlePlayerClick(player.id)}
          >
            {player.name}
          </Button>
        );
      },
    },
    {
      accessorKey: "majorPoints",
      header: "Major Points",
      cell: ({ row }) => {
        const points = row.getValue("majorPoints") as number;
        return <div className="text-center font-medium">{points || 0}</div>;
      },
    },
    {
      accessorKey: "tourPoints",
      header: "Tour Points",
      cell: ({ row }) => {
        const points = row.getValue("tourPoints") as number;
        return <div className="text-center">{points || 0}</div>;
      },
    },
    {
      accessorKey: "leaguePoints",
      header: "League Points",
      cell: ({ row }) => {
        const points = row.getValue("leaguePoints") as number;
        return <div className="text-center">{points || 0}</div>;
      },
    },
    {
      accessorKey: "suprPoints",
      header: "SUPR Points",
      cell: ({ row }) => {
        const points = row.getValue("suprPoints") as number;
        return <div className="text-center">{points || 0}</div>;
      },
    },
    {
      accessorKey: "totalEvents",
      header: "Events",
      cell: ({ row }) => {
        const events = row.getValue("totalEvents") as number;
        return <div className="text-center">{events || 0}</div>;
      },
    },
    {
      accessorKey: "totalPoints",
      header: "Total Points",
      cell: ({ row }) => {
        const points = row.getValue("totalPoints") as number;
        return <div className="text-center font-bold">{points || 0}</div>;
      },
    },
  ];

  const grossColumns: ColumnDef<PlayerWithHistory>[] = [
    {
      accessorKey: "rank",
      header: "Rank",
      cell: ({ row }) => {
        const rank = row.getValue("rank") as number;
        return (
          <div className="font-medium">
            {rank <= 3 ? (
              <Badge variant={rank === 1 ? "default" : rank === 2 ? "secondary" : "outline"}>
                {rank}
              </Badge>
            ) : (
              rank
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "player.name",
      header: "Player",
      cell: ({ row }) => {
        const player = row.original.player;
        return (
          <Button
            variant="link"
            className="p-0 h-auto font-medium text-left justify-start"
            onClick={() => handlePlayerClick(player.id)}
          >
            {player.name}
          </Button>
        );
      },
    },
    {
      accessorKey: "grossTotalPoints",
      header: "Gross Points",
      cell: ({ row }) => {
        const points = row.getValue("grossTotalPoints") as number;
        return <div className="text-center font-bold">{points || 0}</div>;
      },
    },
    {
      accessorKey: "grossTourPoints",
      header: "Gross Tour Points",
      cell: ({ row }) => {
        const points = row.getValue("grossTourPoints") as number;
        return <div className="text-center">{points || 0}</div>;
      },
    },
    {
      accessorKey: "leaguePoints",
      header: "League Points",
      cell: ({ row }) => {
        const points = row.getValue("leaguePoints") as number;
        return <div className="text-center">{points || 0}</div>;
      },
    },
    {
      accessorKey: "suprPoints",
      header: "SUPR Points",
      cell: ({ row }) => {
        const points = row.getValue("suprPoints") as number;
        return <div className="text-center">{points || 0}</div>;
      },
    },
    {
      accessorKey: "totalEvents",
      header: "Events",
      cell: ({ row }) => {
        const events = row.getValue("totalEvents") as number;
        return <div className="text-center">{events || 0}</div>;
      },
    },
  ];

  // Filter leaderboard based on settings
  const getFilteredLeaderboard = (data: PlayerWithHistory[] | undefined) => {
    if (!data || !settings) return data || [];
    
    const scoringType = settings.scoringType || 'both';
    if (scoringType === 'both') return data;
    if (scoringType === 'net' && activeTab === 'net') return data;
    if (scoringType === 'gross' && activeTab === 'gross') return data;
    
    return [];
  };

  const filteredData = getFilteredLeaderboard(leaderboardData);

  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leaderboards</h1>
          <p className="text-muted-foreground">
            View the current standings for both net and gross scoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <FileDown className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="p-6 pb-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="net">Net Leaderboard</TabsTrigger>
                <TabsTrigger value="gross">Gross Leaderboard</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="net" className="p-6 pt-4">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <DataTable
                  columns={netColumns}
                  data={filteredData}
                  pageSize={100}
                />
              )}
            </TabsContent>

            <TabsContent value="gross" className="p-6 pt-4">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <DataTable
                  columns={grossColumns}
                  data={filteredData}
                  pageSize={100}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
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