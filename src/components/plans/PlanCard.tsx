"use client";

import { Archive, Check, Pencil, Trash2, X } from "lucide-react";
import type { PlanAnalyticsEntry, SubscriptionPlan } from "@/lib/api";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/t";

const FEATURE_ROWS: { key: keyof SubscriptionPlan["featureLimits"]; label: string }[] = [
  { key: "advancedReports", label: t("Advanced Reports") },
  { key: "pdfExport", label: t("PDF Export") },
  { key: "multiUser", label: t("Multi-user") },
  { key: "incomeGoalTracking", label: t("Income Goal Tracking") },
];

function formatLimit(value: number): string {
  return value === -1 ? t("Unlimited") : String(value);
}

interface PlanCardProps {
  plan: SubscriptionPlan;
  analytics: PlanAnalyticsEntry | undefined;
  canManage: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export function PlanCard({ plan, analytics, canManage, onEdit, onArchive, onDelete }: PlanCardProps) {
  return (
    <div className={cn("flex flex-col rounded-2xl bg-white p-5 shadow-sm shadow-black/5", !plan.isActive && "opacity-60")}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">{plan.name}</h3>
          <p className="text-sm text-neutral-500">
            {Number(plan.price) === 0 ? t("Free") : `${plan.currency} ${plan.price}`}
            {plan.billingCycle !== "FREE" && ` / ${plan.billingCycle === "MONTHLY" ? t("month") : t("year")}`}
          </p>
        </div>
        {!plan.isActive && (
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500">
            {t("Archived")}
          </span>
        )}
      </div>

      <p className="mt-3 text-sm text-neutral-500">
        {analytics?.totalUsers ?? 0} {t("users")}
        {plan.trialDays > 0 && ` · ${plan.trialDays}${t("d trial")}`}
      </p>

      <div className="mt-4 space-y-1.5 text-sm text-neutral-600">
        <p>
          {t("Workspaces")}: {formatLimit(plan.featureLimits.maxWorkspaces)}
        </p>
        <p>
          {t("Business Workspaces")}: {formatLimit(plan.featureLimits.maxBusinessWorkspaces)}
        </p>
        <p>
          {t("Transactions / Month")}: {formatLimit(plan.featureLimits.maxTransactionsPerMonth)}
        </p>
        {FEATURE_ROWS.map((row) => (
          <p key={row.key} className="flex items-center gap-1.5">
            {plan.featureLimits[row.key] ? (
              <Check className="h-3.5 w-3.5 text-brand-primary" />
            ) : (
              <X className="h-3.5 w-3.5 text-neutral-300" />
            )}
            {row.label}
          </p>
        ))}
      </div>

      {canManage && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
          <button
            type="button"
            onClick={onEdit}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <Pencil className="h-3.5 w-3.5" /> {t("Edit")}
          </button>
          {plan.isActive && (
            <button
              type="button"
              onClick={onArchive}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <Archive className="h-3.5 w-3.5" /> {t("Archive")}
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            title={t("Only allowed if no users are on this plan")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-brand-danger/30 px-3 py-2 text-sm font-medium text-brand-danger hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> {t("Delete")}
          </button>
        </div>
      )}
    </div>
  );
}
