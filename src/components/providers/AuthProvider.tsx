"use client";

import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import type { CurrentUser } from "@/lib/api";
import { logoutAction } from "@/lib/authActions";

// Client-side accessor for the current user so future prompts' Client
// Components can call useAuth() instead of prop-drilling or re-fetching.
// The actual authentication boundary stays server-side (proxy.ts silently
// refreshes the httpOnly-cookie token before it expires, same as
// admin-frontend) -- this provider is just a convenience layer seeded once
// from a server-side getCurrentUser() call in (dashboard)/layout.tsx, not an
// independent client-side auth system. If a future Server Action ever gets a
// 401 that the proxy's proactive refresh didn't catch (e.g. the refresh
// token itself expired), call refreshFailed() to redirect the whole app to
// /login rather than leaving the UI in a stale, half-authenticated state.
interface AuthContextValue {
  user: CurrentUser;
  logout: () => void;
  refreshFailed: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  initialUser: CurrentUser;
  children: ReactNode;
}

export function AuthProvider({ initialUser, children }: AuthProviderProps) {
  const [user] = useState(initialUser);
  const [, startTransition] = useTransition();

  function logout() {
    startTransition(() => logoutAction());
  }

  return <AuthContext.Provider value={{ user, logout, refreshFailed: logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth() must be called within an AuthProvider (see (dashboard)/layout.tsx)");
  }
  return ctx;
}
