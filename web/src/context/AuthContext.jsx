import { useState, createContext, useContext, useEffect } from "react";
import { getSession, logout } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const data = await getSession();
      if (data.authenticated) {
        let avatar = null;
        let displayName = null;
        try {
          const profileRes = await fetch(
            `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(data.did)}`,
          );
          if (profileRes.ok) {
            const profile = await profileRes.json();
            avatar = profile.avatar;
            displayName = profile.displayName;
          }
        } catch (e) {
          console.error("Failed to fetch profile:", e);
        }
        setUser({
          did: data.did,
          handle: data.handle,
          avatar,
          displayName: displayName || data.handle,
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    setUser(null);
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login: () => (window.location.href = "/login"),
    logout: handleLogout,
    refresh: checkSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
