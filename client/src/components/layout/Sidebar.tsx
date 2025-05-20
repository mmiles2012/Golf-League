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
  Settings
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
              <a 
                className={`sidebar-link ${isActive("/") ? "active" : ""}`}
                onClick={onNavigation}
              >
                <Trophy className="sidebar-icon mr-2" />
                <span>Leaderboards</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/upload">
              <a 
                className={`sidebar-link ${isActive("/upload") ? "active" : ""}`}
                onClick={onNavigation}
              >
                <FileUp className="sidebar-icon mr-2" />
                <span>Upload Scores</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/manual-entry">
              <a 
                className={`sidebar-link ${isActive("/manual-entry") ? "active" : ""}`}
                onClick={onNavigation}
              >
                <PenSquare className="sidebar-icon mr-2" />
                <span>Manual Entry</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/tournaments">
              <a 
                className={`sidebar-link ${isActive("/tournaments") ? "active" : ""}`}
                onClick={onNavigation}
              >
                <Flag className="sidebar-icon mr-2" />
                <span>Tournaments</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/players">
              <a 
                className={`sidebar-link ${isActive("/players") ? "active" : ""}`}
                onClick={onNavigation}
              >
                <Users className="sidebar-icon mr-2" />
                <span>Players</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/points-config">
              <a 
                className={`sidebar-link ${isActive("/points-config") ? "active" : ""}`}
                onClick={onNavigation}
              >
                <Settings className="sidebar-icon mr-2" />
                <span>Points Config</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/embed">
              <a 
                className={`sidebar-link ${isActive("/embed") ? "active" : ""}`}
                onClick={onNavigation}
              >
                <Code className="sidebar-icon mr-2" />
                <span>Embed</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/setup">
              <a 
                className={`sidebar-link ${isActive("/setup") ? "active" : ""}`}
                onClick={onNavigation}
              >
                <Settings className="sidebar-icon mr-2" />
                <span>App Setup</span>
              </a>
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
            <button className="text-xs text-white opacity-75 hover:opacity-100 flex items-center">
              <span>Sign Out</span>
              <LogOut className="h-3 w-3 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
