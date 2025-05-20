import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import type { League, InsertLeague } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, PlusCircle, Edit, Trash2, CheckCircle, Calendar, Trophy } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Form schema for creating/editing leagues
const leagueFormSchema = z.object({
  name: z.string().min(1, "League name is required"),
  description: z.string().optional(),
  season: z.string().optional(),
  isActive: z.boolean().default(true),
});

type LeagueFormValues = z.infer<typeof leagueFormSchema>;

export default function LeagueManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [deleteLeagueId, setDeleteLeagueId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch leagues
  const { data: leagues = [], isLoading } = useQuery<League[]>({
    queryKey: ["/api/leagues"],
  });

  // Create league mutation
  const createLeagueMutation = useMutation({
    mutationFn: (data: InsertLeague) => 
      apiRequest("/api/leagues", { method: "POST", data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leagues"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "League Created",
        description: "The league has been created successfully.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Creating League",
        description: "There was a problem creating the league. Please try again.",
        variant: "destructive",
      });
      console.error("Create league error:", error);
    },
  });

  // Update league mutation
  const updateLeagueMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertLeague> }) => 
      apiRequest(`/api/leagues/${id}`, { method: "PUT", data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leagues"] });
      setIsEditDialogOpen(false);
      toast({
        title: "League Updated",
        description: "The league has been updated successfully.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Updating League",
        description: "There was a problem updating the league. Please try again.",
        variant: "destructive",
      });
      console.error("Update league error:", error);
    },
  });

  // Delete league mutation
  const deleteLeagueMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/leagues/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leagues"] });
      setIsDeleteDialogOpen(false);
      toast({
        title: "League Deleted",
        description: "The league has been deleted successfully.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Deleting League",
        description: "There was a problem deleting the league. Please try again.",
        variant: "destructive",
      });
      console.error("Delete league error:", error);
    },
  });

  // Form for creating a new league
  const createForm = useForm<LeagueFormValues>({
    resolver: zodResolver(leagueFormSchema),
    defaultValues: {
      name: "",
      description: "",
      season: "",
      isActive: true,
    },
  });

  // Form for editing a league
  const editForm = useForm<LeagueFormValues>({
    resolver: zodResolver(leagueFormSchema),
    defaultValues: {
      name: "",
      description: "",
      season: "",
      isActive: true,
    },
  });

  // Handle form submission for new league
  const onCreateSubmit = (values: LeagueFormValues) => {
    createLeagueMutation.mutate(values);
  };

  // Handle form submission for editing league
  const onEditSubmit = (values: LeagueFormValues) => {
    if (editingLeague) {
      updateLeagueMutation.mutate({ id: editingLeague.id, data: values });
    }
  };

  // Handle edit button click
  const handleEditClick = (league: League) => {
    setEditingLeague(league);
    
    // Reset form with league data
    editForm.reset({
      name: league.name,
      description: league.description || "",
      season: league.season || "",
      isActive: league.isActive,
    });
    
    setIsEditDialogOpen(true);
  };

  // Handle delete button click
  const handleDeleteClick = (id: number) => {
    setDeleteLeagueId(id);
    setIsDeleteDialogOpen(true);
  };

  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (deleteLeagueId !== null) {
      deleteLeagueMutation.mutate(deleteLeagueId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">League Management</h1>
          <p className="text-neutral-600">Create and manage multiple golf leagues</p>
        </div>
        
        <Button 
          onClick={() => {
            createForm.reset();
            setIsCreateDialogOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <PlusCircle size={18} />
          <span>Add League</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : leagues.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center space-y-4">
            <Trophy className="h-12 w-12 text-neutral-300" />
            <div>
              <h3 className="text-lg font-medium">No Leagues Found</h3>
              <p className="text-neutral-500 max-w-md mt-1">
                Create your first league to get started. Each league can have its own tournaments and leaderboards.
              </p>
            </div>
            <Button 
              onClick={() => {
                createForm.reset();
                setIsCreateDialogOpen(true);
              }}
              className="mt-2"
            >
              Create First League
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>League Name</TableHead>
                <TableHead>Season</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[150px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leagues.map((league) => (
                <TableRow key={league.id}>
                  <TableCell className="font-medium">
                    <div className="font-medium">{league.name}</div>
                    {league.description && (
                      <div className="text-sm text-neutral-500 mt-1 max-w-xs truncate">
                        {league.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{league.season || "—"}</TableCell>
                  <TableCell>
                    {league.isActive ? (
                      <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-neutral-100 text-neutral-800 hover:bg-neutral-100">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(league.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(league)}
                      >
                        <Edit size={16} className="mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(league.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create League Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New League</DialogTitle>
            <DialogDescription>
              Create a new golf league. You can add tournaments to this league later.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>League Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter league name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createForm.control}
                name="season"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Season</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 2025" {...field} />
                    </FormControl>
                    <FormDescription>Optional season or year for this league</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter league description" className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
                      <FormDescription>
                        Active leagues are displayed in the main leaderboard
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch 
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createLeagueMutation.isPending}
                >
                  {createLeagueMutation.isPending ? "Creating..." : "Create League"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit League Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit League</DialogTitle>
            <DialogDescription>
              Update the league details.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>League Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter league name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="season"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Season</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 2025" {...field} />
                    </FormControl>
                    <FormDescription>Optional season or year for this league</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter league description" className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
                      <FormDescription>
                        Active leagues are displayed in the main leaderboard
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch 
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateLeagueMutation.isPending}
                >
                  {updateLeagueMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete this league and all its associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteLeagueMutation.isPending}
            >
              {deleteLeagueMutation.isPending ? "Deleting..." : "Delete League"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}