import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type AuthContextType = {
  isAuthenticated: boolean;
  isPublicView: boolean;
  login: () => void;
  logout: () => void;
  togglePublicView: () => void;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isPublicView: false,
  login: () => {},
  logout: () => {},
  togglePublicView: () => {},
});

export const useAuth = () => useContext(AuthContext);

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Initialize state from sessionStorage for better session management
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = sessionStorage.getItem('hideout_auth');
    return saved ? JSON.parse(saved) : false;
  });

  // For non-login pages, public view is enabled by default
  const [isPublicView, setIsPublicView] = useState<boolean>(() => {
    const saved = sessionStorage.getItem('hideout_public_view');
    // Default to true to enable public view on initial load
    return saved ? JSON.parse(saved) : true;
  });

  // Update sessionStorage when state changes for better session handling
  useEffect(() => {
    sessionStorage.setItem('hideout_auth', JSON.stringify(isAuthenticated));
  }, [isAuthenticated]);

  useEffect(() => {
    sessionStorage.setItem('hideout_public_view', JSON.stringify(isPublicView));
  }, [isPublicView]);

  // Add a global event listener to handle auth changes across components
  useEffect(() => {
    // Create a custom event we can dispatch from anywhere to force auth resets
    const handleAuthEvent = (event: CustomEvent) => {
      if (event.detail === 'logout') {
        setIsAuthenticated(false);
        setIsPublicView(true);
      }
    };

    window.addEventListener('auth-event' as any, handleAuthEvent as any);

    return () => {
      window.removeEventListener('auth-event' as any, handleAuthEvent as any);
    };
  }, []);

  const login = () => {
    setIsAuthenticated(true);
    setIsPublicView(false);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setIsPublicView(true); // Enable public view when logging out

    // Also dispatch the global event in case any components need to react
    const event = new CustomEvent('auth-event', { detail: 'logout' });
    window.dispatchEvent(event);
  };

  const togglePublicView = () => {
    setIsPublicView(!isPublicView);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isPublicView,
        login,
        logout,
        togglePublicView,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
