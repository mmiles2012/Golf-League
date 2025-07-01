import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: userProfile, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    user: userProfile?.user,
    player: userProfile?.player,
    linkedPlayerId: userProfile?.linkedPlayerId,
    isLoading,
    isAuthenticated: !!userProfile?.user,
    isAdmin: userProfile?.user?.role === 'admin' || userProfile?.user?.role === 'super_admin',
    isSuperAdmin: userProfile?.user?.role === 'super_admin',
    error,
  };
}