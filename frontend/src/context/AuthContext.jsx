import { createContext, useCallback, useContext, useState } from "react";
 
const TOKEN_KEY = "crm_token";
const USER_KEY = "crm_user";
 
const AuthContext = createContext(null);
 
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem(USER_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  });
 
   const login = useCallback((newToken, userData) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
 }, []);
 
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);
 
  const authHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );
 
  const isAdmin = user?.role === "admin";

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token),
    isAdmin,
    login,
    logout,
    authHeaders,
  };
 
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
 
export function useAuth() {
  const context = useContext(AuthContext);
 
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
 
  return context;
}