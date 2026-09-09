"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { AuditLogEntryRow, FullAdminUser, ListMeta } from "@/lib/api";
import { auditActionLabel } from "@/lib/auditActionLabels";
import { t } from "@/lib/i18n/t";
import { isSensitiveEntry, SensitiveBadge } from "./SensitiveBadge";

interface AuditLogTableProps {
  logs: AuditLogEntryRow[];
  meta: ListMeta;
  admins: FullAdminUser[];
}

export function AuditLogTable({ logs, meta, admins }: AuditLogTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

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
    startTransition(() => router.push(`/admin/security?${params.toString()}`));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-black/5">
        <select
          value={searchParams.get("adminUserId") ?? ""}
          onChange={(e) => updateParams({ adminUserId: e.target.value || null })}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="">{t("All admins")}</option>
          {admins.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {admin.name}
            </option>
          ))}
        </select>

        <input
          value={searchParams.get("entityType") ?? ""}
          onChange={(e) => updateParams({ entityType: e.target.value || null })}
          placeholder={t("Entity type (e.g. PlatformUser)")}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        />

        <input
          value={searchParams.get("action") ?? ""}
          onChange={(e) => updateParams({ action: e.target.value || null })}
          placeholder={t("Action (e.g. USER_SUSPENDED)")}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        />

        <input
          type="date"
          value={searchParams.get("dateFrom") ?? ""}
          onChange={(e) => updateParams({ dateFrom: e.target.value || null })}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
        />
        <input
          type="date"
          value={searchParams.get("dateTo") ?? ""}
          onChange={(e) => updateParams({ dateTo: e.target.value || null })}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
        />

        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={searchParams.get("sensitiveOnly") === "true"}
            onChange={(e) => updateParams({ sensitiveOnly: e.target.checked ? "true" : null })}
            className="h-4 w-4 rounded border-neutral-300 text-brand-primary focus:ring-brand-primary"
          />
          {t("Sensitive only")}
        </label>
      </div>

      <div className={`overflow-x-auto rounded-2xl bg-white shadow-sm shadow-black/5 ${isPending ? "opacity-60" : ""}`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">{t("Date")}</th>
              <th className="px-4 py-3 font-medium">{t("Admin")}</th>
              <th className="px-4 py-3 font-medium">{t("Action")}</th>
              <th className="px-4 py-3 font-medium">{t("Entity")}</th>
              <th className="px-4 py-3 font-medium">{t("IP")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-neutral-50/60">
                <td className="px-4 py-3 text-neutral-500">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-neutral-700">{log.adminUser.name}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/security/${log.id}`} className="flex items-center gap-2 font-medium text-neutral-900 hover:text-brand-primary hover:underline">
                    {isSensitiveEntry(log.newValue) && <SensitiveBadge />}
                    {auditActionLabel(log.action)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {log.entityType}
                  {log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}
                </td>
                <td className="px-4 py-3 text-neutral-500">{log.ipAddress ?? "—"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">
                  {t("No audit log entries match these filters.")}
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
    </div>
  );
}
