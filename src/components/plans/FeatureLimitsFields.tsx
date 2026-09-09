"use client";

import type { FeatureLimits } from "@/lib/api";
import { t } from "@/lib/i18n/t";

interface FeatureLimitsFieldsProps {
  value: FeatureLimits;
  onChange: (value: FeatureLimits) => void;
}

const NUMBER_FIELDS: { key: keyof FeatureLimits; label: string; hint: string }[] = [
  { key: "maxWorkspaces", label: t("Max Workspaces"), hint: "" },
  { key: "maxBusinessWorkspaces", label: t("Max Business Workspaces"), hint: t("-1 = unlimited") },
  { key: "maxTransactionsPerMonth", label: t("Max Transactions / Month"), hint: t("-1 = unlimited") },
];

const BOOLEAN_FIELDS: { key: keyof FeatureLimits; label: string }[] = [
  { key: "advancedReports", label: t("Advanced Reports") },
  { key: "pdfExport", label: t("PDF Export") },
  { key: "multiUser", label: t("Multi-user") },
  { key: "incomeGoalTracking", label: t("Income Goal Tracking") },
];

export function FeatureLimitsFields({ value, onChange }: FeatureLimitsFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {NUMBER_FIELDS.map((field) => (
          <div key={field.key}>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              {field.label} {field.hint && <span className="text-neutral-400">({field.hint})</span>}
            </label>
            <input
              type="number"
              value={value[field.key] as number}
              onChange={(e) => onChange({ ...value, [field.key]: Number(e.target.value) })}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {BOOLEAN_FIELDS.map((field) => (
          <label
            key={field.key}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              checked={value[field.key] as boolean}
              onChange={(e) => onChange({ ...value, [field.key]: e.target.checked })}
              className="h-4 w-4 accent-brand-primary"
            />
            {field.label}
          </label>
        ))}
      </div>
    </div>
  );
}
