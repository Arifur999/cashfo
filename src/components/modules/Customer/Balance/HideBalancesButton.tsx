"use client";

import { Eye, EyeOff } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// The round eye on the Balance pages' headers: hides every figure, or shows
// them again.
export function HideBalancesButton({ hidden, onToggle, className }: { hidden: boolean; onToggle: () => void; className?: string }) {
  const { t } = useLocale();
  const label = t(hidden ? "Show balances" : "Hide balances");
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={hidden}
      aria-label={label}
      title={label}
      className={cn("flex size-10.5 shrink-0 items-center justify-center rounded-full border border-input bg-surface text-ink-2 transition-colors hover:bg-surface-sunken pointer-coarse:size-11", className)}
    >
      {hidden ? <EyeOff className="size-4.5" aria-hidden="true" /> : <Eye className="size-4.5" aria-hidden="true" />}
    </button>
  );
}
