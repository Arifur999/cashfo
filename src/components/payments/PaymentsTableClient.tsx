"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Eye, Search } from "lucide-react";
import type { ListMeta, Payment, PaymentGateway, PaymentStatus } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { t } from "@/lib/i18n/t";
import { GatewayBadge } from "./GatewayBadge";
import { PaymentStatusBadge } from "./PaymentStatusBadge";

const STATUS_OPTIONS: PaymentStatus[] = ["PENDING", "SUCCESS", "FAILED", "REFUNDED"];
const GATEWAY_OPTIONS: PaymentGateway[] = ["BKASH", "NAGAD", "SSLCOMMERZ", "CARD", "MANUAL"];

interface PaymentsTableClientProps {
  payments: Payment[];
  meta: ListMeta;
  showFailureReason?: boolean;
  basePath?: string;
}

export function PaymentsTableClient({ payments, meta, showFailureReason = false, basePath = "/admin/payments" }: PaymentsTableClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const debouncedSearch = useDebouncedValue(search, 400);

  function updateParams(updates: Record<string, string | number | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, String(value));
    }
    if (!("page" in updates)) params.delete("page");
    startTransition(() => router.push(`${basePath}?${params.toString()}`));
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
            placeholder={t("Search by user, email, or invoice #...")}
            className="w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
        {!showFailureReason && (
          <select
            value={searchParams.get("status") ?? ""}
            onChange={(e) => updateParams({ status: e.target.value || null })}
            className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
          >
            <option value="">{t("All statuses")}</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
        <select
          value={searchParams.get("gateway") ?? ""}
          onChange={(e) => updateParams({ gateway: e.target.value || null })}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="">{t("All gateways")}</option>
          {GATEWAY_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
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
      </div>

      <div className={`overflow-x-auto rounded-2xl bg-white shadow-sm shadow-black/5 ${isPending ? "opacity-60" : ""}`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">{t("Date")}</th>
              <th className="px-4 py-3 font-medium">{t("User")}</th>
              <th className="px-4 py-3 font-medium">{t("Plan")}</th>
              <th className="px-4 py-3 font-medium">{t("Amount")}</th>
              <th className="px-4 py-3 font-medium">{t("Gateway")}</th>
              {showFailureReason ? (
                <th className="px-4 py-3 font-medium">{t("Failure Reason")}</th>
              ) : (
                <th className="px-4 py-3 font-medium">{t("Status")}</th>
              )}
              <th className="px-4 py-3 font-medium">{t("Invoice #")}</th>
              <th className="px-4 py-3 font-medium text-right">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-neutral-50/60">
                <td className="px-4 py-3 text-neutral-500">{new Date(payment.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-neutral-900">{payment.platformUser?.name ?? t("Unknown")}</p>
                  <p className="text-xs text-neutral-400">{payment.platformUser?.email}</p>
                </td>
                <td className="px-4 py-3 text-neutral-500">{payment.plan.name}</td>
                <td className="px-4 py-3 font-medium text-neutral-900">
                  {payment.currency} {payment.amount}
                </td>
                <td className="px-4 py-3">
                  <GatewayBadge gateway={payment.gateway} />
                </td>
                {showFailureReason ? (
                  <td className="px-4 py-3 text-brand-danger">{payment.failureReason ?? "—"}</td>
                ) : (
                  <td className="px-4 py-3">
                    <PaymentStatusBadge status={payment.status} />
                  </td>
                )}
                <td className="px-4 py-3 font-mono text-xs text-neutral-500">{payment.invoice?.invoiceNumber ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/payments/${payment.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100"
                  >
                    <Eye className="h-3.5 w-3.5" /> {t("View")}
                  </Link>
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-neutral-400">
                  {t("No payments match these filters.")}
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
