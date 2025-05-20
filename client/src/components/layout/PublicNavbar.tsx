import { Link, useLocation } from "wouter";
import { Trophy, ListOrdered, Users, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function PublicNavbar() {
  const [location] = useLocation();
  const { login } = useAuth();
  
  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };
  
  return (
    <header className="sticky top-0 z-10 w-full bg-white border-b border-neutral-200">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <span className="font-bold text-lg text-primary">Hideout Golf League</span>
              </div>
            </Link>
          </div>
          
          <nav className="mx-auto">
            <ul className="flex items-center space-x-8">
              <li>
                <Link href="/">
                  <div className={`flex items-center py-2 hover:text-primary ${isActive("/") ? "text-primary font-medium border-b-2 border-primary" : "text-neutral-600"}`}>
                    <Trophy className="h-4 w-4 mr-2" />
                    <span>Leaderboards</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link href="/tournament-results">
                  <div className={`flex items-center py-2 hover:text-primary ${isActive("/tournament-results") ? "text-primary font-medium border-b-2 border-primary" : "text-neutral-600"}`}>
                    <ListOrdered className="h-4 w-4 mr-2" />
                    <span>Tournament Results</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link href="/players">
                  <div className={`flex items-center py-2 hover:text-primary ${isActive("/players") ? "text-primary font-medium border-b-2 border-primary" : "text-neutral-600"}`}>
                    <Users className="h-4 w-4 mr-2" />
                    <span>Players</span>
                  </div>
                </Link>
              </li>
            </ul>
          </nav>
          
          <div>
            <Button onClick={() => login()} size="sm" className="inline-flex items-center">
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}