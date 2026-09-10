"use client";

import { useAuth } from "@/components/providers/AuthProvider";

// Full dashboard UI (transactions, accounts, budgets) comes in a much later
// prompt -- this just proves the auth + workspace flow works end-to-end.
export default function DashboardPage() {
  const { user, activeBusiness } = useAuth();

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <h1 className="text-xl font-semibold text-neutral-900">Dashboard — {activeBusiness?.name ?? "..."}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Welcome, {user.name} ({user.email})
      </p>
      <p className="mt-6 max-w-sm text-sm text-neutral-400">
        The full app (transactions, accounts, budgets) is being built next -- this page just confirms your account and workspace switching work.
      </p>
    </div>
  );
}
