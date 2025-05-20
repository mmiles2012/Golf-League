import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, PlusCircle, Edit, Trash2, CheckCircle, Calendar, Trophy } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Form schema for creating/editing leagues
const leagueFormSchema = z.object({
  name: z.string().min(2, { message: "League name must be at least 2 characters." }),
  description: z.string().nullable().optional(),
  season: z.string().nullable().optional(),
  isActive: z.boolean().default(true)
});

type LeagueFormValues = z.infer<typeof leagueFormSchema>;

// The main LeagueManagement component
export default function LeagueManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentLeague, setCurrentLeague] = useState<any>(null);
  
  // Initialize the form
  const form = useForm<LeagueFormValues>({
    resolver: zodResolver(leagueFormSchema),
    defaultValues: {
      name: "",
      description: "",
      season: "",
      isActive: true
    }
  });
  
  // Create mutation
  const createLeagueMutation = useMutation({
    mutationFn: (data: LeagueFormValues) => 
      fetch("/api/leagues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      }).then(res => {
        if (!res.ok) throw new Error("Failed to create league");
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leagues"] });
      toast({
        title: "League Created",
        description: "The league has been created successfully.",
      });
      setIsCreateModalOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create league: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Edit mutation
  const editLeagueMutation = useMutation({
    mutationFn: (data: LeagueFormValues) => 
      fetch(`/api/leagues/${currentLeague?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      }).then(res => {
        if (!res.ok) throw new Error("Failed to update league");
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leagues"] });
      toast({
        title: "League Updated",
        description: "The league has been updated successfully.",
      });
      setIsEditModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update league: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Delete mutation
  const deleteLeagueMutation = useMutation({
    mutationFn: () => 
      fetch(`/api/leagues/${currentLeague?.id}`, {
        method: "DELETE"
      }).then(res => {
        if (!res.ok) throw new Error("Failed to delete league");
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leagues"] });
      toast({
        title: "League Deleted",
        description: "The league has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete league: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Fetch leagues
  const { data: leagues, isLoading, error } = useQuery({
    queryKey: ["/api/leagues"],
    queryFn: () => fetch("/api/leagues").then(res => res.json())
  });
  
  // Form submission handlers
  const onCreateSubmit = (values: LeagueFormValues) => {
    createLeagueMutation.mutate(values);
  };
  
  const onEditSubmit = (values: LeagueFormValues) => {
    editLeagueMutation.mutate(values);
  };
  
  // Handle edit button click
  const handleEditClick = (league: any) => {
    setCurrentLeague(league);
    form.reset({
      name: league.name,
      description: league.description || "",
      season: league.season || "",
      isActive: league.isActive
    });
    setIsEditModalOpen(true);
  };
  
  // Handle delete button click
  const handleDeleteClick = (league: any) => {
    setCurrentLeague(league);
    setIsDeleteDialogOpen(true);
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">League Management</h1>
          <p className="text-muted-foreground">Create and manage your golf leagues</p>
        </div>
        <Button onClick={() => {
          form.reset({
            name: "",
            description: "",
            season: "",
            isActive: true
          });
          setIsCreateModalOpen(true);
        }}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New League
        </Button>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-20" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="bg-destructive/10 border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-destructive">Failed to load leagues</p>
            </div>
          </CardContent>
        </Card>
      ) : leagues?.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center space-y-4">
            <Trophy className="h-12 w-12 text-neutral-300" />
            <div>
              <h3 className="text-lg font-medium">No Leagues Found</h3>
              <p className="text-neutral-500 max-w-md mt-1">
                Create your first league to get started. Each league can have its own tournaments and leaderboards.
              </p>
              <Button 
                className="mt-4"
                onClick={() => {
                  form.reset({
                    name: "",
                    description: "",
                    season: "",
                    isActive: true
                  });
                  setIsCreateModalOpen(true);
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Create League
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leagues.map((league: any) => (
            <Card key={league.id} className={`overflow-hidden ${!league.isActive ? 'opacity-75' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle>{league.name}</CardTitle>
                  {league.isActive ? (
                    <Badge variant="default" className="bg-green-500">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </div>
                {league.season && (
                  <CardDescription className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    Season: {league.season}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {league.description || "No description provided."}
                </p>
                
                {/* Stats section */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="flex flex-col items-center justify-center bg-muted rounded-md p-2">
                    <span className="text-xs text-muted-foreground">Tournaments</span>
                    <span className="font-medium">{league.tournamentCount || 0}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-muted rounded-md p-2">
                    <span className="text-xs text-muted-foreground">Players</span>
                    <span className="font-medium">{league.playerCount || 0}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => handleEditClick(league)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => handleDeleteClick(league)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* Create League Dialog */}
      <Dialog 
        open={isCreateModalOpen} 
        onOpenChange={setIsCreateModalOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New League</DialogTitle>
            <DialogDescription>
              Enter the details of your new golf league.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>League Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="Hideout Golf League" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="season"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Season</FormLabel>
                    <FormControl>
                      <Input placeholder="2025" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormDescription>
                      Optionally add a season year or name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter a description of this league..." 
                        className="resize-none" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
                      <FormDescription>
                        Whether this league is currently active
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createLeagueMutation.isPending}
                >
                  {createLeagueMutation.isPending ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2">⟳</span> Creating...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4" /> Create League
                    </span>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit League Dialog */}
      <Dialog 
        open={isEditModalOpen} 
        onOpenChange={setIsEditModalOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit League</DialogTitle>
            <DialogDescription>
              Update the details of {currentLeague?.name}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>League Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="Hideout Golf League" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="season"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Season</FormLabel>
                    <FormControl>
                      <Input placeholder="2025" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormDescription>
                      Optionally add a season year or name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter a description of this league..." 
                        className="resize-none" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
                      <FormDescription>
                        Whether this league is currently active
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={editLeagueMutation.isPending}
                >
                  {editLeagueMutation.isPending ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2">⟳</span> Updating...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <CheckCircle className="mr-2 h-4 w-4" /> Update League
                    </span>
                  )}
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
              This will permanently delete the league "{currentLeague?.name}" and all its associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteLeagueMutation.mutate();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLeagueMutation.isPending ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">⟳</span> Deleting...
                </span>
              ) : (
                "Delete League"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}