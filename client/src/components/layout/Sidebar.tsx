import { useLocation, Link } from "wouter";
import { 
  LayoutDashboard, 
  Trophy, 
  FileUp, 
  PenSquare, 
  Flag, 
  Users, 
  Code, 
  LogOut,
  LogIn,
  User,
  Settings,
  Award,
  ListOrdered,
  ServerCog,
  List
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface SidebarProps {
  onNavigation?: () => void;
}

export default function Sidebar({ onNavigation }: SidebarProps) {
  const [location, navigate] = useLocation();
  const { user, isAuthenticated, isAdmin, isLoading, isSuperAdmin } = useAuth();
  
  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };
  
  const handleLogout = () => {
    window.location.href = '/api/logout';
    if (onNavigation) onNavigation();
  };
  
  const handleLogin = () => {
    window.location.href = '/api/login';
    if (onNavigation) onNavigation();
  };
  
  return (
    <>
      <nav className="flex-grow py-4">
        <ul className="space-y-1">
          {/* Always Visible - Main Views */}
          <li>
            <Link href="/">
              <div 
                className={`sidebar-link ${isActive("/") ? "active" : ""}`}
                onClick={onNavigation}
              >
                <Trophy className="sidebar-icon mr-2" />
                <span>Leaderboards</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/tournament-results">
              <div 
                className={`sidebar-link ${isActive("/tournament-results") ? "active" : ""}`}
                onClick={onNavigation}
              >
                <ListOrdered className="sidebar-icon mr-2" />
                <span>Tournament Results</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/players">
              <div 
                className={`sidebar-link ${isActive("/players") ? "active" : ""}`}
                onClick={onNavigation}
              >
                <Users className="sidebar-icon mr-2" />
                <span>Players</span>
              </div>
            </Link>
          </li>
          
          {/* Divider */}
          <li className="my-4 border-t border-primary-light/20"></li>
          
          {/* Authenticated User Functions */}
          {isAuthenticated && (
            <>
              <li>
                <Link href="/dashboard">
                  <div 
                    className={`sidebar-link ${isActive("/dashboard") ? "active" : ""}`}
                    onClick={onNavigation}
                  >
                    <LayoutDashboard className="sidebar-icon mr-2" />
                    <span>My Dashboard</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link href="/manual-entry">
                  <div 
                    className={`sidebar-link ${isActive("/manual-entry") ? "active" : ""}`}
                    onClick={onNavigation}
                  >
                    <PenSquare className="sidebar-icon mr-2" />
                    <span>Manual Entry</span>
                  </div>
                </Link>
              </li>
            </>
          )}

          {/* Admin-only functions - Only visible to admins */}
          {isAdmin && (
            <>
              <li>
                <Link href="/tournaments">
                  <div 
                    className={`sidebar-link ${isActive("/tournaments") ? "active" : ""}`}
                    onClick={onNavigation}
                  >
                    <Flag className="sidebar-icon mr-2" />
                    <span>Tournament Manager</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link href="/upload">
                  <div 
                    className={`sidebar-link ${isActive("/upload") ? "active" : ""}`}
                    onClick={onNavigation}
                  >
                    <FileUp className="sidebar-icon mr-2" />
                    <span>Upload Scores</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link href="/points-config">
                  <div 
                    className={`sidebar-link ${isActive("/points-config") ? "active" : ""}`}
                    onClick={onNavigation}
                  >
                    <Settings className="sidebar-icon mr-2" />
                    <span>Points Config</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link href="/setup">
                  <div 
                    className={`sidebar-link ${isActive("/setup") ? "active" : ""}`}
                    onClick={onNavigation}
                  >
                    <Settings className="sidebar-icon mr-2" />
                    <span>App Setup</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link href="/admin-recalculation">
                  <div 
                    className={`sidebar-link ${isActive("/admin-recalculation") ? "active" : ""}`}
                    onClick={onNavigation}
                  >
                    <ServerCog className="sidebar-icon mr-2" />
                    <span>Recalculate Points</span>
                  </div>
                </Link>
              </li>
              {/* Super admin: log viewer */}
              {isSuperAdmin && (
                <li>
                  <Link href="/admin-recalculation-log">
                    <div 
                      className={`sidebar-link ${isActive("/admin-recalculation-log") ? "active" : ""}`}
                      onClick={onNavigation}
                    >
                      <List className="sidebar-icon mr-2" />
                      <span>Recalc Logs</span>
                    </div>
                  </Link>
                </li>
              )}
            </>
          )}
          

        </ul>
      </nav>
      
      <div className="p-3 border-t border-primary-light">
        {isAuthenticated ? (
          <div className="flex items-center space-x-2">
            {user?.profileImageUrl ? (
              <img 
                src={user.profileImageUrl} 
                alt="Profile" 
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-white flex items-center justify-center text-primary">
                <User size={12} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">
                {user?.firstName || user?.email || 'User'}
              </p>
              <button 
                type="button"
                className="text-xs text-white opacity-75 hover:opacity-100 flex items-center cursor-pointer bg-transparent border-0"
                onClick={handleLogout}
              >
                <span>Sign Out</span>
                <LogOut className="h-3 w-3 ml-1" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-white">
              <User size={12} />
            </div>
            <div className="flex-1">
              <div 
                className="text-sm text-white opacity-75 hover:opacity-100 flex items-center cursor-pointer"
                onClick={handleLogin}
              >
                <span>Sign In</span>
                <LogIn className="h-3 w-3 ml-1" />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
