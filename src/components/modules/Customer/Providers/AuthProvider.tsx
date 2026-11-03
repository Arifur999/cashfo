"use client";

import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { SignOutDialog } from "@/components/modules/Customer/Layout/SignOutDialog";
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
// It also names the open workspace, resolved server-side from the
// workspace cookie (lib/customer/activeBusiness.ts), and which PIN-locked
// workspaces this device has already opened. The switchers
// (Workspace/useWorkspaceSwitch.tsx) read both: switching goes through
// switchWorkspaceAction, which checks the id and sets the cookie, then a
// refresh hands this provider the new values. Nothing here reads the
// cookie or decides what is allowed -- the server and the API do.
interface AuthContextValue {
  user: CurrentUser;
  activeBusinessId: string | null;
  activeBusiness: UserBusiness | undefined;
  // PIN-locked workspaces this device holds a live unlock for (all of them
  // in an admin's read-only view, which the API never asks). Locked ones
  // missing here ask for the PIN before they open.
  unlockedBusinessIds: string[];
  // Signs out at once (true: on every device too).
  logout: (everywhere?: boolean) => void;
  // Asks first ("Sign out?", with the every-device choice): what a Sign out
  // button does.
  askSignOut: () => void;
  refreshFailed: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  initialUser: CurrentUser;
  initialActiveBusinessId: string | null;
  unlockedBusinessIds?: string[];
  children: ReactNode;
}

const NONE: string[] = [];

export function AuthProvider({ initialUser, initialActiveBusinessId, unlockedBusinessIds = NONE, children }: AuthProviderProps) {
  // Read straight from the props, never copied into state: router.refresh()
  // re-runs the layout and passes fresh values, which a useState would
  // ignore after the first render.
  const user = initialUser;
  const activeBusinessId = initialActiveBusinessId;
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);

  const [, startTransition] = useTransition();
  const [asking, setAsking] = useState(false);

  // Only a real true counts: a button wired straight to logout hands it its
  // click event.
  function logout(everywhere?: boolean) {
    startTransition(() => logoutAction(everywhere === true));
  }

  return (
    <AuthContext.Provider value={{ user, activeBusinessId, activeBusiness, unlockedBusinessIds, logout, askSignOut: () => setAsking(true), refreshFailed: () => logout() }}>
      {children}
      <SignOutDialog open={asking} onClose={() => setAsking(false)} onSignOut={logout} />
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
