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
  User,
  Settings,
  Award,
  ListOrdered
} from "lucide-react";

interface SidebarProps {
  onNavigation?: () => void;
}

export default function Sidebar({ onNavigation }: SidebarProps) {
  const [location] = useLocation();
  
  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };
  
  return (
    <>
      <nav className="flex-grow py-4">
        <ul className="space-y-1">
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
            <Link href="/leagues">
              <div 
                className={`sidebar-link ${isActive("/leagues") ? "active" : ""}`}
                onClick={onNavigation}
              >
                <Award className="sidebar-icon mr-2" />
                <span>Leagues</span>
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
            <Link href="/embed">
              <div 
                className={`sidebar-link ${isActive("/embed") ? "active" : ""}`}
                onClick={onNavigation}
              >
                <Code className="sidebar-icon mr-2" />
                <span>Embed</span>
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
        </ul>
      </nav>
      
      <div className="p-4 border-t border-primary-light">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-primary">
            <User size={16} />
          </div>
          <div>
            <p className="text-white font-medium">Admin User</p>
            <div className="text-xs text-white opacity-75 hover:opacity-100 flex items-center cursor-pointer">
              <span>Sign Out</span>
              <LogOut className="h-3 w-3 ml-1" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
