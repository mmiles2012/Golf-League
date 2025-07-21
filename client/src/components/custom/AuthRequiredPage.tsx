import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Lock, UserX, Shield } from 'lucide-react';

interface AuthRequiredPageProps {
  requiredRole?: 'authenticated' | 'admin' | 'super_admin';
  children: React.ReactNode;
}

export default function AuthRequiredPage({
  requiredRole = 'authenticated',
  children,
}: AuthRequiredPageProps) {
  const { isAuthenticated, isAdmin, isSuperAdmin, isLoading } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if user is authenticated when authentication is required
  if (requiredRole !== 'authenticated' && !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="p-4 rounded-full bg-red-50 text-red-600">
          <UserX className="h-12 w-12" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-neutral-800 mb-2">Authentication Required</h2>
          <p className="text-neutral-600 mb-4">You need to be logged in to access this page.</p>
          <Button
            onClick={() => (window.location.href = '/api/login')}
            className="bg-primary hover:bg-primary/90"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Check if user has required admin role
  if (requiredRole === 'admin' && !isAdmin && !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="p-4 rounded-full bg-amber-50 text-amber-600">
          <Lock className="h-12 w-12" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-neutral-800 mb-2">Admin Access Required</h2>
          <p className="text-neutral-600 mb-4">
            You don't have the necessary permissions to access this page. Contact an administrator
            if you believe this is an error.
          </p>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Check if user has required super admin role
  if (requiredRole === 'super_admin' && !isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="p-4 rounded-full bg-red-50 text-red-600">
          <Shield className="h-12 w-12" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-neutral-800 mb-2">Super Admin Access Required</h2>
          <p className="text-neutral-600 mb-4">
            This page requires super administrator privileges.
          </p>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // User has required permissions, render the protected content
  return <>{children}</>;
}
