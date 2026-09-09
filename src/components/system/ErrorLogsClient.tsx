"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useState, useTransition } from "react";
import { toast } from "sonner";
import type { ErrorLogRow, ErrorLogSource, ListMeta, Severity } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { resolveErrorAction } from "@/app/admin/(dashboard)/system/_actions";
import { ErrorSourceBadge } from "./ErrorSourceBadge";
import { SeverityBadge } from "./SeverityBadge";

const SOURCES: ErrorLogSource[] = ["BACKEND_API", "ADMIN_FRONTEND", "BACKGROUND_JOB"];
const SEVERITIES: Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

interface ErrorLogsClientProps {
  errors: ErrorLogRow[];
  meta: ListMeta;
}

export function ErrorLogsClient({ errors, meta }: ErrorLogsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    startTransition(() => router.push(`/admin/system/errors?${params.toString()}`));
  }

  async function handleResolve(id: string) {
    const result = await resolveErrorAction(id);
    if (result.success) {
      toast.success(t("Marked as resolved."));
      startTransition(() => router.refresh());
    } else {
      toast.error(result.message ?? t("Failed to resolve"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-black/5">
        <select
          value={searchParams.get("source") ?? ""}
          onChange={(e) => updateParams({ source: e.target.value || null })}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="">{t("All sources")}</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select
          value={searchParams.get("severity") ?? ""}
          onChange={(e) => updateParams({ severity: e.target.value || null })}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="">{t("All severities")}</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={searchParams.get("resolved") ?? ""}
          onChange={(e) => updateParams({ resolved: e.target.value || null })}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="">{t("All statuses")}</option>
          <option value="false">{t("Unresolved")}</option>
          <option value="true">{t("Resolved")}</option>
        </select>
      </div>

      <div className={`overflow-x-auto rounded-2xl bg-white shadow-sm shadow-black/5 ${isPending ? "opacity-60" : ""}`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">{t("Date")}</th>
              <th className="px-4 py-3 font-medium">{t("Source")}</th>
              <th className="px-4 py-3 font-medium">{t("Severity")}</th>
              <th className="px-4 py-3 font-medium">{t("Message")}</th>
              <th className="px-4 py-3 font-medium">{t("Resolved")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {errors.map((error) => (
              <Fragment key={error.id}>
                <tr
                  onClick={() => setExpandedId(expandedId === error.id ? null : error.id)}
                  className="cursor-pointer hover:bg-neutral-50/60"
                >
                  <td className="px-4 py-3 text-neutral-500">{new Date(error.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <ErrorSourceBadge source={error.source} />
                  </td>
                  <td className="px-4 py-3">
                    <SeverityBadge severity={error.severity} />
                  </td>
                  <td className="max-w-md truncate px-4 py-3 text-neutral-700">{error.message}</td>
                  <td className="px-4 py-3">
                    {error.resolved ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        {t("Resolved")}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolve(error.id);
                        }}
                        className="rounded-lg border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
                      >
                        {t("Mark Resolved")}
                      </button>
                    )}
                  </td>
                </tr>
                {expandedId === error.id && (
                  <tr>
                    <td colSpan={5} className="bg-neutral-50 px-4 py-3">
                      <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-neutral-900 p-3 font-mono text-xs text-neutral-100">
                        {error.stackTrace ?? t("No stack trace recorded.")}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {errors.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">
                  {t("No error logs match these filters.")}
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
