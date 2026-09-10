"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import type { CurrentUser, UserBusiness } from "@/lib/api";
import { logoutAction } from "@/lib/authActions";
import { switchWorkspaceAction } from "@/lib/businessActions";

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
//
// Also holds the "active workspace" (Prompt 3) -- which of the user's
// businesses is currently selected. The backend has no concept of this (see
// backend/src/businesses/businesses.module.ts); it's tracked here, seeded
// from an httpOnly cookie resolved server-side in (dashboard)/layout.tsx
// (src/lib/activeBusiness.ts). switchWorkspace() writes the new choice back
// to that cookie then refreshes the current route so any server-fetched data
// on the page re-renders for the newly-active workspace.
interface AuthContextValue {
  user: CurrentUser;
  activeBusinessId: string | null;
  activeBusiness: UserBusiness | undefined;
  switchWorkspace: (businessId: string) => void;
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
  // `user` is NOT copied into local state -- it must always reflect
  // initialUser as-passed. router.refresh() re-runs (dashboard)/layout.tsx's
  // getCurrentUser() and passes a fresh initialUser prop on every workspace
  // create/update/delete; a useState(initialUser) would freeze the FIRST
  // value forever (React only uses a useState initializer on mount) and the
  // businesses list would never pick up changes without a full page load.
  const user = initialUser;

  // activeBusinessId DOES need local state, for optimistic UI (the switcher
  // highlights the new selection immediately, before the round trip to set
  // the cookie + router.refresh() finishes) -- but it must still re-sync
  // whenever the server recomputes it (e.g. after the cookie write lands).
  // Adjusted during render (React's documented pattern for "reset state when
  // a prop changes") rather than in a useEffect, which would cause an extra
  // render pass for something derivable synchronously.
  const [activeBusinessId, setActiveBusinessId] = useState(initialActiveBusinessId);
  const [prevInitialActiveBusinessId, setPrevInitialActiveBusinessId] = useState(initialActiveBusinessId);
  if (initialActiveBusinessId !== prevInitialActiveBusinessId) {
    setPrevInitialActiveBusinessId(initialActiveBusinessId);
    setActiveBusinessId(initialActiveBusinessId);
  }

  const [, startTransition] = useTransition();
  const router = useRouter();

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);

  function switchWorkspace(businessId: string) {
    setActiveBusinessId(businessId);
    startTransition(async () => {
      await switchWorkspaceAction(businessId);
      router.refresh();
    });
  }

  function logout() {
    startTransition(() => logoutAction());
  }

  return (
    <AuthContext.Provider value={{ user, activeBusinessId, activeBusiness, switchWorkspace, logout, refreshFailed: logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth() must be called within an AuthProvider (see (dashboard)/layout.tsx)");
  }
  return ctx;
}
