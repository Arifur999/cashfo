"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ListMeta, LoginAttemptRow } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { t } from "@/lib/i18n/t";

interface LoginAttemptsTableProps {
  attempts: LoginAttemptRow[];
  meta: ListMeta;
}

export function LoginAttemptsTable({ attempts, meta }: LoginAttemptsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const debouncedEmail = useDebouncedValue(email, 400);
  const [ipAddress, setIpAddress] = useState(searchParams.get("ipAddress") ?? "");
  const debouncedIp = useDebouncedValue(ipAddress, 400);

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
    startTransition(() => router.push(`/admin/security/logins?${params.toString()}`));
  }

  useEffect(() => {
    if (debouncedEmail === (searchParams.get("email") ?? "")) return;
    updateParams({ email: debouncedEmail || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedEmail]);

  useEffect(() => {
    if (debouncedIp === (searchParams.get("ipAddress") ?? "")) return;
    updateParams({ ipAddress: debouncedIp || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedIp]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-black/5">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("Filter by email...")}
            className="w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
        <input
          value={ipAddress}
          onChange={(e) => setIpAddress(e.target.value)}
          placeholder={t("Filter by IP...")}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        />
        <select
          value={searchParams.get("success") ?? ""}
          onChange={(e) => updateParams({ success: e.target.value || null })}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="">{t("All results")}</option>
          <option value="true">{t("Success")}</option>
          <option value="false">{t("Failed")}</option>
        </select>
      </div>

      <div className={`overflow-x-auto rounded-2xl bg-white shadow-sm shadow-black/5 ${isPending ? "opacity-60" : ""}`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">{t("Date")}</th>
              <th className="px-4 py-3 font-medium">{t("Email")}</th>
              <th className="px-4 py-3 font-medium">{t("IP Address")}</th>
              <th className="px-4 py-3 font-medium">{t("Result")}</th>
              <th className="px-4 py-3 font-medium">{t("Reason")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {attempts.map((attempt) => (
              <tr key={attempt.id} className="hover:bg-neutral-50/60">
                <td className="px-4 py-3 text-neutral-500">{new Date(attempt.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-neutral-700">{attempt.email}</td>
                <td className="px-4 py-3 text-neutral-500">{attempt.ipAddress}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      attempt.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
                    )}
                  >
                    {attempt.success ? t("Success") : t("Failed")}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-500">{attempt.failureReason?.replaceAll("_", " ") ?? "—"}</td>
              </tr>
            ))}
            {attempts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">
                  {t("No login attempts match these filters.")}
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
