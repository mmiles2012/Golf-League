import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { Menu, X } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside 
        className={`bg-primary w-full md:w-64 md:flex-shrink-0 md:flex flex-col transition-transform duration-300 ease-in-out fixed md:static top-0 left-0 h-full z-40 ${
          isMobileMenuOpen ? "mobile-menu-open" : "mobile-menu-closed md:transform-none"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-primary-light">
          <div className="flex items-center space-x-2">
            <img src="/images/hideout-logo.png" alt="Hideout Logo" className="h-8 w-8" />
            <h1 className="font-heading font-bold text-white text-xl">Hideout League</h1>
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
      
      {/* Mobile Header */}
      <div className="md:hidden bg-primary text-white p-4 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center space-x-2">
          <img src="/images/hideout-logo.png" alt="Hideout Logo" className="h-6 w-6" />
          <h1 className="font-heading font-bold">Hideout League</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)} 
          className="text-white"
        >
          <Menu size={24} />
        </button>
      </div>
      
      {/* Main Content */}
      <main className="flex-grow p-4 md:p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
