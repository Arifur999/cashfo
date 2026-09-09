"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { FeatureFlagRow, SubscriptionPlanOption } from "@/lib/api";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n/t";
import { updateFeatureFlagAction } from "@/app/admin/(dashboard)/system/_actions";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((id, i) => id === sortedB[i]);
}

interface FlagRowProps {
  flag: FeatureFlagRow;
  planOptions: SubscriptionPlanOption[];
}

function FlagRow({ flag, planOptions }: FlagRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isTogglingEnabled, setIsTogglingEnabled] = useState(false);
  const [rolloutPercent, setRolloutPercent] = useState(flag.rolloutPercent);
  const [targetPlanIds, setTargetPlanIds] = useState<string[]>(flag.targetPlanIds);
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = rolloutPercent !== flag.rolloutPercent || !sameIds(targetPlanIds, flag.targetPlanIds);

  async function handleToggle() {
    setIsTogglingEnabled(true);
    const result = await updateFeatureFlagAction(flag.id, { isEnabled: !flag.isEnabled });
    setIsTogglingEnabled(false);
    if (result.success) {
      toast.success(flag.isEnabled ? t("Flag disabled.") : t("Flag enabled."));
      startTransition(() => router.refresh());
    } else {
      toast.error(result.message ?? t("Failed to update flag"));
    }
  }

  async function handleSave() {
    setIsSaving(true);
    const result = await updateFeatureFlagAction(flag.id, { rolloutPercent, targetPlanIds });
    setIsSaving(false);
    if (result.success) {
      toast.success(t("Saved."));
      startTransition(() => router.refresh());
    } else {
      toast.error(result.message ?? t("Failed to update flag"));
    }
  }

  function togglePlan(planId: string) {
    setTargetPlanIds((prev) => (prev.includes(planId) ? prev.filter((id) => id !== planId) : [...prev, planId]));
  }

  return (
    <tr className={cn("hover:bg-neutral-50/60", isPending && "opacity-60")}>
      <td className="px-4 py-3 font-mono text-xs text-neutral-600">{flag.key}</td>
      <td className="px-4 py-3 font-medium text-neutral-900">{flag.name}</td>
      <td className="max-w-xs truncate px-4 py-3 text-neutral-500" title={flag.description ?? undefined}>
        {flag.description ?? "—"}
      </td>
      <td className="px-4 py-3">
        <ToggleSwitch checked={flag.isEnabled} onChange={handleToggle} disabled={isTogglingEnabled} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={rolloutPercent}
            onChange={(e) => setRolloutPercent(Number(e.target.value))}
            className="w-24 accent-[color:var(--color-brand-primary)]"
          />
          <span className="w-10 text-xs text-neutral-500">{rolloutPercent}%</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {planOptions.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => togglePlan(plan.id)}
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs transition-colors",
                targetPlanIds.includes(plan.id)
                  ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                  : "border-neutral-200 text-neutral-500 hover:border-neutral-300",
              )}
            >
              {plan.name}
            </button>
          ))}
          {targetPlanIds.length === 0 && <span className="text-xs text-neutral-400">{t("All plans")}</span>}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          disabled={!isDirty || isSaving}
          onClick={handleSave}
          className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
        >
          {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
          {t("Save")}
        </button>
      </td>
    </tr>
  );
}

interface FeatureFlagsClientProps {
  flags: FeatureFlagRow[];
  planOptions: SubscriptionPlanOption[];
}

export function FeatureFlagsClient({ flags, planOptions }: FeatureFlagsClientProps) {
  if (flags.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center text-neutral-400 shadow-sm shadow-black/5">
        {t("No feature flags yet.")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm shadow-black/5">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
          <tr>
            <th className="px-4 py-3 font-medium">{t("Key")}</th>
            <th className="px-4 py-3 font-medium">{t("Name")}</th>
            <th className="px-4 py-3 font-medium">{t("Description")}</th>
            <th className="px-4 py-3 font-medium">{t("Enabled")}</th>
            <th className="px-4 py-3 font-medium">{t("Rollout")}</th>
            <th className="px-4 py-3 font-medium">{t("Target Plans")}</th>
            <th className="px-4 py-3 font-medium text-right" />
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-50">
          {flags.map((flag) => (
            <FlagRow key={flag.id} flag={flag} planOptions={planOptions} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
