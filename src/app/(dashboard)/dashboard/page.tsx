"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Full dashboard UI (transactions, accounts, budgets) comes in a much later
// prompt -- this just proves the auth + workspace flow works end-to-end.
export default function DashboardPage() {
  const { user, activeBusiness } = useAuth();
  const { t } = useLocale();

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <h1 className="text-xl font-semibold text-neutral-900">
        {t("Dashboard")} — {activeBusiness?.name ?? "..."}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        {t("Welcome,")} {user.name} ({user.email})
      </p>
      <p className="mt-6 max-w-sm text-sm text-neutral-400">
        {t(
          "The full app (transactions, accounts, budgets) is being built next -- this page just confirms your account and workspace switching work.",
        )}
      </p>
    </div>
  );
}
