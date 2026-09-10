"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { LogoutButton } from "@/components/dashboard/LogoutButton";

// Full dashboard UI (transactions, accounts, budgets) comes in a much later
// prompt -- this just proves the auth flow works end-to-end (fetches
// /api/auth/me via the (dashboard) layout, shown here through useAuth()).
export default function DashboardPage() {
  const { user } = useAuth();
  const defaultBusiness = user.businesses.find((b) => b.isDefault);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-brand-content px-4 text-center">
      <h1 className="text-2xl font-semibold text-neutral-900">Welcome, {user.name}</h1>
      <p className="text-sm text-neutral-500">{user.email}</p>
      {defaultBusiness && (
        <p className="rounded-full bg-brand-primary/10 px-4 py-1.5 text-sm font-medium text-brand-primary">
          Workspace: {defaultBusiness.name}
        </p>
      )}
      <p className="max-w-sm text-sm text-neutral-400">
        The full app (transactions, accounts, budgets) is being built next -- this page just confirms your account works.
      </p>
      <LogoutButton />
    </div>
  );
}
