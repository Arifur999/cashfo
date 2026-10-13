"use client";

import { createContext, useContext, useTransition, type ReactNode } from "react";
import type { CurrentUser, UserBusiness } from "@/lib/customer/api";
import { logoutAction } from "@/app/-actions/authActions";

// Client-side accessor for the current customer, so Client Components can
// call useAuth() instead of prop-drilling or re-fetching. The authentication
// boundary stays server-side (proxy.ts refreshes the httpOnly-cookie token
// before it expires) -- this provider is a convenience layer seeded from the
// customer layout's getCurrentUser(), not a client-side auth system. If an
// action ever gets a 401 the proxy's refresh didn't prevent (the refresh
// token itself expired), call refreshFailed() to sign out cleanly rather
// than leave the UI half-authenticated.
//
// It also names the active workspace, resolved server-side
// (lib/customer/activeBusiness.ts). Every account has one workspace now, so
// there is nothing to switch between here.
interface AuthContextValue {
  user: CurrentUser;
  activeBusinessId: string | null;
  activeBusiness: UserBusiness | undefined;
  logout: () => void;
  refreshFailed: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  initialUser: CurrentUser;
  initialActiveBusinessId: string | null;
  children: ReactNode;
}

export function AuthProvider({ initialUser, initialActiveBusinessId, children }: AuthProviderProps) {
  // Read straight from the props, never copied into state: router.refresh()
  // re-runs the layout and passes fresh values, which a useState would
  // ignore after the first render.
  const user = initialUser;
  const activeBusinessId = initialActiveBusinessId;
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);

  const [, startTransition] = useTransition();

  function logout() {
    startTransition(() => logoutAction());
  }

  return (
    <AuthContext.Provider value={{ user, activeBusinessId, activeBusiness, logout, refreshFailed: logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth() must be called within an AuthProvider (see app/(customerLayout)/layout.tsx)");
  }
  return ctx;
}
