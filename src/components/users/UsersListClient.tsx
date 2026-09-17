"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";
import type { OwnerOverviewItem, OwnerStatus, SubscriptionPlanOption } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { t } from "@/lib/i18n/t";
import { StatusBadge } from "./StatusBadge";
import { UserActionsMenu } from "./UserActionsMenu";

const STATUS_OPTIONS: OwnerStatus[] = ["ACTIVE", "SUSPENDED", "DELETED"];

interface UsersListClientProps {
  owners: OwnerOverviewItem[];
  page: number;
  limit: number;
  totalCount: number;
  plans: SubscriptionPlanOption[];
}

export function UsersListClient({ owners, page, limit, totalCount, plans }: UsersListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const totalPages = Math.max(Math.ceil(totalCount / limit), 1);

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const debouncedSearch = useDebouncedValue(search, 400);

  function updateParams(updates: Record<string, string | number | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, String(value));
    }
    params.delete("page"); // any filter change resets to page 1, except explicit page changes below
    if ("page" in updates && updates.page !== null) {
      params.set("page", String(updates.page));
    }
    startTransition(() => router.push(`/admin/users?${params.toString()}`));
  }

  // Push the debounced search value to the URL once it settles.
  useEffect(() => {
    if (debouncedSearch === (searchParams.get("search") ?? "")) return;
    updateParams({ search: debouncedSearch || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-black/5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Search by name, business, email, or phone...")}
            className="w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <select
          value={searchParams.get("status") ?? ""}
          onChange={(e) => updateParams({ status: e.target.value || null })}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="">{t("All statuses")}</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          value={searchParams.get("planId") ?? ""}
          onChange={(e) => updateParams({ planId: e.target.value || null })}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="">{t("All plans")}</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
      </div>

      <div className={`overflow-x-auto rounded-2xl bg-white shadow-sm shadow-black/5 ${isPending ? "opacity-60" : ""}`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">{t("Name")}</th>
              <th className="px-4 py-3 font-medium">{t("Email")}</th>
              <th className="px-4 py-3 font-medium">{t("Status")}</th>
              <th className="px-4 py-3 font-medium">{t("Plan")}</th>
              <th className="px-4 py-3 font-medium">{t("Workspaces")}</th>
              <th className="px-4 py-3 font-medium">{t("Last Login")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {owners.map((owner) => (
              <tr key={owner.userId} className="hover:bg-neutral-50/60">
                <td className="px-4 py-3 font-medium text-neutral-900">{owner.name}</td>
                <td className="px-4 py-3 text-neutral-500">{owner.email}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={owner.status} />
                </td>
                <td className="px-4 py-3 text-neutral-500">{owner.planName ?? t("None")}</td>
                <td className="px-4 py-3 text-neutral-500">{owner.workspaceCount}</td>
                <td className="px-4 py-3 text-neutral-500">
                  {owner.lastLoginAt ? new Date(owner.lastLoginAt).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <UserActionsMenu owner={owner} />
                </td>
              </tr>
            ))}
            {owners.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-neutral-400">
                  {t("No users match these filters.")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm shadow-sm shadow-black/5">
        <span className="text-neutral-500">
          {t("Page")} {page} {t("of")} {totalPages} &middot; {totalCount} {t("total")}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => updateParams({ page: page - 1 })}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-neutral-600 disabled:opacity-40"
          >
            {t("Previous")}
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => updateParams({ page: page + 1 })}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-neutral-600 disabled:opacity-40"
          >
            {t("Next")}
          </button>
        </div>
      </div>
    </div>
  );
}
