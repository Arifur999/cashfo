"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import type { ApiRateLimitLogRow, ListMeta } from "@/lib/api";
import { t } from "@/lib/i18n/t";

interface RateLimitsClientProps {
  logs: ApiRateLimitLogRow[];
  meta: ListMeta;
}

export function RateLimitsClient({ logs, meta }: RateLimitsClientProps) {
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
    startTransition(() => router.push(`/admin/system/rate-limits?${params.toString()}`));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-black/5">
        <select
          value={searchParams.get("limitExceeded") ?? ""}
          onChange={(e) => updateParams({ limitExceeded: e.target.value || null })}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="">{t("All entries")}</option>
          <option value="true">{t("Limit exceeded only")}</option>
        </select>
      </div>

      <div className={`overflow-x-auto rounded-2xl bg-white shadow-sm shadow-black/5 ${isPending ? "opacity-60" : ""}`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">{t("Window Start")}</th>
              <th className="px-4 py-3 font-medium">{t("Endpoint")}</th>
              <th className="px-4 py-3 font-medium">{t("Requests")}</th>
              <th className="px-4 py-3 font-medium">{t("Identifier")}</th>
              <th className="px-4 py-3 font-medium">{t("Exceeded")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {logs.map((log) => (
              <tr key={log.id} className={cn("hover:bg-neutral-50/60", log.limitExceeded && "bg-red-50/70")}>
                <td className="px-4 py-3 text-neutral-500">{new Date(log.windowStart).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-700">{log.endpoint}</td>
                <td className="px-4 py-3 text-neutral-500">{log.requestCount}</td>
                <td className="px-4 py-3 text-neutral-500">
                  {log.identifierType}: {log.identifier}
                </td>
                <td className="px-4 py-3">
                  {log.limitExceeded && (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                      {t("Exceeded")}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">
                  {t("No rate-limit entries match this filter.")}
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
