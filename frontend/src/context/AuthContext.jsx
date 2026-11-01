import React from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken } from "../api.js";
 
const AuthContext = createContext(null);
 
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));
 
  useEffect(() => {
    if (!getToken()) return;
    api
      .get("/api/auth/me")
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);
 
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, []);
 
  const finish = useCallback((data) => {
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);
 
  const login = useCallback(
    async (email, password) => finish(await api.publicPost("/api/auth/login", { email, password })),
    [finish]
  );
  const register = useCallback(
    async (full_name, email, password) =>
      finish(await api.publicPost("/api/auth/register", { full_name, email, password })),
    [finish]
  );
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);
 
  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
 
export const useAuth = () => useContext(AuthContext);
