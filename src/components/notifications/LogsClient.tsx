"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { ListMeta, NotificationChannel, NotificationLogRow, NotificationLogStatus } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { NotificationChannelBadge } from "./NotificationChannelBadge";
import { NotificationLogStatusBadge } from "./NotificationLogStatusBadge";

const CHANNELS: NotificationChannel[] = ["EMAIL", "SMS", "IN_APP_PUSH"];
const STATUSES: NotificationLogStatus[] = ["QUEUED", "SENT", "FAILED"];

interface LogsClientProps {
  logs: NotificationLogRow[];
  meta: ListMeta;
}

export function LogsClient({ logs, meta }: LogsClientProps) {
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
    startTransition(() => router.push(`/admin/notifications/history?${params.toString()}`));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-black/5">
        <select
          value={searchParams.get("channel") ?? ""}
          onChange={(e) => updateParams({ channel: e.target.value || null })}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="">{t("All channels")}</option>
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {c.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select
          value={searchParams.get("status") ?? ""}
          onChange={(e) => updateParams({ status: e.target.value || null })}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="">{t("All statuses")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className={`overflow-x-auto rounded-2xl bg-white shadow-sm shadow-black/5 ${isPending ? "opacity-60" : ""}`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">{t("User")}</th>
              <th className="px-4 py-3 font-medium">{t("Template")}</th>
              <th className="px-4 py-3 font-medium">{t("Channel")}</th>
              <th className="px-4 py-3 font-medium">{t("Status")}</th>
              <th className="px-4 py-3 font-medium">{t("Sent At")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-neutral-50/60">
                <td className="px-4 py-3 text-neutral-700">
                  {log.platformUser ? (
                    <>
                      <p>{log.platformUser.name}</p>
                      <p className="text-xs text-neutral-400">{log.platformUser.email}</p>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-600">{log.templateKey}</td>
                <td className="px-4 py-3">
                  <NotificationChannelBadge channel={log.channel} />
                </td>
                <td className="px-4 py-3">
                  <NotificationLogStatusBadge status={log.status} />
                  {log.errorMessage && <p className="mt-0.5 text-xs text-brand-danger">{log.errorMessage}</p>}
                </td>
                <td className="px-4 py-3 text-neutral-500">{log.sentAt ? new Date(log.sentAt).toLocaleString() : "—"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">
                  {t("No notification logs match these filters.")}
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
