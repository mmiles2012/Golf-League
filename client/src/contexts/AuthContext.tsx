import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
  // Initialize state from localStorage if available
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem("hideout_auth");
    return saved ? JSON.parse(saved) : false;
  });
  
  const [isPublicView, setIsPublicView] = useState<boolean>(() => {
    const saved = localStorage.getItem("hideout_public_view");
    return saved ? JSON.parse(saved) : false;
  });

  // Update localStorage when state changes
  useEffect(() => {
    localStorage.setItem("hideout_auth", JSON.stringify(isAuthenticated));
  }, [isAuthenticated]);
  
  useEffect(() => {
    localStorage.setItem("hideout_public_view", JSON.stringify(isPublicView));
  }, [isPublicView]);

  const login = () => {
    setIsAuthenticated(true);
    setIsPublicView(false);
  };

  const logout = () => {
    setIsAuthenticated(false);
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
        togglePublicView
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};