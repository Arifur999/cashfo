"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Plus, Search } from "lucide-react";
import type { AdminOption, ListMeta, SupportTicket, TicketCategory, TicketPriority, TicketStatus } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { t } from "@/lib/i18n/t";
import { NewTicketModal } from "./NewTicketModal";
import { TicketPriorityBadge } from "./TicketPriorityBadge";
import { TicketStatusBadge } from "./TicketStatusBadge";

const STATUS_OPTIONS: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_ON_USER", "RESOLVED", "CLOSED"];
const PRIORITY_OPTIONS: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const CATEGORY_OPTIONS: TicketCategory[] = ["BILLING", "TECHNICAL", "ACCOUNT", "FEATURE_REQUEST", "BUG_REPORT", "OTHER"];

interface TicketsTableClientProps {
  tickets: SupportTicket[];
  meta: ListMeta;
  admins: AdminOption[];
  canManage: boolean;
}

export function TicketsTableClient({ tickets, meta, admins, canManage }: TicketsTableClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const debouncedSearch = useDebouncedValue(search, 400);

  function updateParams(updates: Record<string, string | number | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, String(value));
    }
    params.delete("page");
    if ("page" in updates && updates.page !== null) {
      params.set("page", String(updates.page));
    }
    startTransition(() => router.push(`/admin/support?${params.toString()}`));
  }

  useEffect(() => {
    if (debouncedSearch === (searchParams.get("search") ?? "")) return;
    updateParams({ search: debouncedSearch || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-black/5">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Search subject or user...")}
            className="w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <select
          value={searchParams.get("status") ?? ""}
          onChange={(e) => updateParams({ status: e.target.value || null })}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="">{t("All statuses")}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>

        <select
          value={searchParams.get("priority") ?? ""}
          onChange={(e) => updateParams({ priority: e.target.value || null })}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="">{t("All priorities")}</option>
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          value={searchParams.get("category") ?? ""}
          onChange={(e) => updateParams({ category: e.target.value || null })}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="">{t("All categories")}</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c.replaceAll("_", " ")}
            </option>
          ))}
        </select>

        <select
          value={searchParams.get("assignedToAdminId") ?? ""}
          onChange={(e) => updateParams({ assignedToAdminId: e.target.value || null })}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="">{t("All assignees")}</option>
          {admins.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {admin.name}
            </option>
          ))}
        </select>

        {canManage && (
          <button
            type="button"
            onClick={() => setIsNewTicketOpen(true)}
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
          >
            <Plus className="h-4 w-4" />
            {t("New Ticket")}
          </button>
        )}
      </div>

      <div className={`overflow-x-auto rounded-2xl bg-white shadow-sm shadow-black/5 ${isPending ? "opacity-60" : ""}`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">{t("Subject")}</th>
              <th className="px-4 py-3 font-medium">{t("User")}</th>
              <th className="px-4 py-3 font-medium">{t("Category")}</th>
              <th className="px-4 py-3 font-medium">{t("Priority")}</th>
              <th className="px-4 py-3 font-medium">{t("Status")}</th>
              <th className="px-4 py-3 font-medium">{t("Assigned To")}</th>
              <th className="px-4 py-3 font-medium">{t("Last Updated")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-neutral-50/60">
                <td className="px-4 py-3 font-medium text-neutral-900">
                  <Link href={`/admin/support/${ticket.id}`} className="hover:text-brand-primary hover:underline">
                    {ticket.subject}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {ticket.platformUser ? (
                    <>
                      <p className="text-neutral-700">{ticket.platformUser.name}</p>
                      <p className="text-xs">{ticket.platformUser.email}</p>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-500">{ticket.category.replaceAll("_", " ")}</td>
                <td className="px-4 py-3">
                  <TicketPriorityBadge priority={ticket.priority} />
                </td>
                <td className="px-4 py-3">
                  <TicketStatusBadge status={ticket.status} />
                </td>
                <td className="px-4 py-3 text-neutral-500">{ticket.assignedAdmin?.name ?? t("Unassigned")}</td>
                <td className="px-4 py-3 text-neutral-500">{new Date(ticket.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-neutral-400">
                  {t("No tickets match these filters.")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm shadow-sm shadow-black/5">
        <span className="text-neutral-500">
          {t("Page")} {meta.page} {t("of")} {Math.max(meta.totalPage, 1)} &middot; {meta.total} {t("total")}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={meta.page <= 1}
            onClick={() => updateParams({ page: meta.page - 1 })}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-neutral-600 disabled:opacity-40"
          >
            {t("Previous")}
          </button>
          <button
            type="button"
            disabled={meta.page >= meta.totalPage}
            onClick={() => updateParams({ page: meta.page + 1 })}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-neutral-600 disabled:opacity-40"
          >
            {t("Next")}
          </button>
        </div>
      </div>

      {canManage && <NewTicketModal open={isNewTicketOpen} onClose={() => setIsNewTicketOpen(false)} />}
    </div>
  );
}
