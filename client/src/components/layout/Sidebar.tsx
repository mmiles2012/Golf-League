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
  ListOrdered
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  onNavigation?: () => void;
}

export default function Sidebar({ onNavigation }: SidebarProps) {
  const [location, navigate] = useLocation();
  const { logout, isAuthenticated, isPublicView } = useAuth();
  
  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };
  
  const handleLogout = () => {
    logout();
    // Force page refresh to ensure auth state is properly reset
    // This fixes the issue with logout on the leaderboard page
    window.location.href = "/";
    if (onNavigation) onNavigation();
  };
  
  const handleLogin = () => {
    navigate("/login");
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
          
          {/* Admin-only functions - Only visible when authenticated */}
          {isAuthenticated && (
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
            </>
          )}
          
          {/* Public view - show message about admin functions */}
          {!isAuthenticated && (
            <li className="px-4 py-3 text-sm text-white/70 italic">
              <div className="border border-white/20 rounded-md p-3 bg-white/5">
                <p>Sign in as an administrator to access tournament management functions</p>
                <button 
                  onClick={handleLogin}
                  className="mt-2 text-white bg-primary/70 hover:bg-primary w-full py-1 px-3 rounded-md text-sm flex items-center justify-center"
                >
                  <LogIn className="h-3 w-3 mr-1" />
                  Sign In
                </button>
              </div>
            </li>
          )}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-primary-light">
        {isAuthenticated ? (
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-primary">
              <User size={16} />
            </div>
            <div>
              <p className="text-white font-medium">Admin User</p>
              <div 
                className="text-xs text-white opacity-75 hover:opacity-100 flex items-center cursor-pointer"
                onClick={handleLogout}
              >
                <span>Sign Out</span>
                <LogOut className="h-3 w-3 ml-1" />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white">
              <User size={16} />
            </div>
            <div>
              <p className="text-white font-medium">Public View</p>
              <div 
                className="text-xs text-white opacity-75 hover:opacity-100 flex items-center cursor-pointer"
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
