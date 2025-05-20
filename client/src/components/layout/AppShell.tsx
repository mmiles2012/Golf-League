import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "./Sidebar";
import PublicNavbar from "./PublicNavbar";
import { Menu, X } from "lucide-react";
import { AppSettings } from "@shared/schema";
import { useAuth } from "@/contexts/AuthContext";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, isPublicView } = useAuth();
  
  // Fetch app settings
  const { data: settings } = useQuery<AppSettings>({
    queryKey: ["/api/settings"],
    // If there's an error fetching settings, the app will continue with default styles
  });

  // Default app settings if none are found
  const appName = settings?.appName || "Hideout Golf League";
  const logoUrl = settings?.logoUrl || "/images/hideout-logo.png";
  const sidebarColor = settings?.sidebarColor || "#0f172a";

  // Close mobile menu on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // If neither authenticated nor in public view, do not render any content
  if (!isAuthenticated && !isPublicView) {
    return children;
  }
  
  // Public view - horizontal navbar
  if (isPublicView) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicNavbar />
        <main className="flex-grow p-4 md:p-6 w-full overflow-auto">
          {children}
        </main>
      </div>
    );
  }
  
  // Admin view - sidebar navigation
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar Navigation - Fixed on desktop, slides in/out on mobile */}
      <aside 
        style={{ backgroundColor: sidebarColor }}
        className={`w-full md:w-64 md:flex-shrink-0 md:flex flex-col transition-transform duration-300 ease-in-out fixed top-0 left-0 h-full z-50 overflow-y-auto ${
          isMobileMenuOpen ? "mobile-menu-open" : "mobile-menu-closed md:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-opacity-20 border-white">
          <div className="flex items-center space-x-2">
            <img src={logoUrl} alt="Logo" className="h-8 w-8 object-contain" />
            <h1 className="font-heading font-bold text-white text-xl">{appName}</h1>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)} 
            className="md:hidden text-white"
          >
            <X size={24} />
          </button>
        </div>
        
        <Sidebar onNavigation={() => setIsMobileMenuOpen(false)} />
      </aside>
      
      {/* Mobile Header - Only visible on mobile */}
      <div 
        style={{ backgroundColor: sidebarColor }}
        className="md:hidden text-white p-4 flex justify-between items-center sticky top-0 z-30"
      >
        <div className="flex items-center space-x-2">
          <img src={logoUrl} alt="Logo" className="h-6 w-6 object-contain" />
          <h1 className="font-heading font-bold">{appName}</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)} 
          className="text-white"
        >
          <Menu size={24} />
        </button>
      </div>
      
      {/* Main Content - Takes full width on mobile, has margin on desktop */}
      <main className="flex-grow p-4 md:p-6 w-full overflow-auto md:ml-64 mt-14 md:mt-0">
        {children}
      </main>
    </div>
  );
}
