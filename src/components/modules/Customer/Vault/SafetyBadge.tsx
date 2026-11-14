"use client";

import type { Safety } from "@/lib/customer/vaultDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { SAFETY_BADGE } from "./vaultCategoryDisplay";

// Safe, Reused, Weak or Old: a login's worst problem, as a small pill.
export function SafetyBadge({ safety, icon = true, className }: { safety: Safety; icon?: boolean; className?: string }) {
  const { t } = useLocale();
  const badge = SAFETY_BADGE[safety];
  return (
    <span className={cn("inline-flex w-fit items-center gap-1.25 rounded-full px-2.25 py-0.75 text-caption leading-[normal] font-semibold whitespace-nowrap", badge.className, className)}>
      {icon && <badge.icon className="size-2.75" strokeWidth={2.75} aria-hidden="true" />}
      {t(badge.label)}
    </span>
  );
}
