"use client";

import { ArrowRight, Clock, RefreshCw, TriangleAlert } from "lucide-react";
import Button from "@/components/smartly/Button";
import { type CheckupLoad, type SafetyView, type VaultHealth, type VaultView } from "@/lib/customer/vaultDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface VaultHealthBarProps {
  // Null until the checkup answers.
  health: VaultHealth | null;
  load: CheckupLoad;
  view: VaultView;
  // A chip: show only that problem (pressed again: every login).
  onFilter: (view: SafetyView) => void;
  onFix: () => void;
  onRetry: () => void;
}

const CHIPS: { view: SafetyView; key: "reused" | "weak" | "old"; label: string; tip: string; icon: typeof Clock; off: string; on: string }[] = [
  { view: "REUSED", key: "reused", label: "Reused", tip: "Show only reused passwords", icon: TriangleAlert, off: "border-bar-expense-key text-loss-ink", on: "border-loss-ink bg-expense-soft text-loss-ink" },
  { view: "WEAK", key: "weak", label: "Weak", tip: "Show only weak passwords", icon: TriangleAlert, off: "border-orange-line text-orange", on: "border-orange bg-orange-soft text-orange" },
  { view: "OLD", key: "old", label: "Old", tip: "Show only old passwords", icon: Clock, off: "border-pill-amber-line text-warning", on: "border-warning bg-warning-soft text-warning" },
];

const RADIUS = 21;
const CIRCLE = 2 * Math.PI * RADIUS;

// The vault's health, full width over the list (design VaultHome): a small
// ring with the share of safe logins, how many need a quick fix, the
// Reused / Weak / Old chips that filter the list, and Fix them. Green with
// nothing to fix.
export function VaultHealthBar({ health, load, view, onFilter, onFix, onRetry }: VaultHealthBarProps) {
  const { t, fmt } = useLocale();
  const n = (value: number) => formatCount(value, fmt);
  const clean = health !== null && health.flagged === 0;
  const percent = health?.percent ?? 0;
  const ring = percent >= 90 ? "stroke-emerald" : percent >= 70 ? "stroke-jade" : "stroke-warning-fill";

  const title =
    health === null
      ? load === "failed"
        ? t("The security checkup couldn't run.")
        : t("Checking your logins…")
      : clean
        ? t("Every login looks safe")
        : t(health.flagged === 1 ? "{count} login needs a quick fix" : "{count} logins need a quick fix", { count: n(health.flagged) });
  const sub =
    health === null
      ? load === "failed"
        ? t("Your logins are fine to use; only the check didn't answer.")
        : t("Looking for reused, weak and old passwords.")
      : clean
        ? t("Nothing to fix. Check back after you add new logins.")
        : t("{safe} of {total} logins are safe", { safe: n(health.safe), total: n(health.total) });

  return (
    <section aria-label={t("Vault health")} className={cn("flex min-h-19 flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border py-3 pr-4 pl-3.5 shadow-sm", clean ? "border-emerald-line bg-emerald-soft" : "border-line-card bg-surface")}>
      <span className="relative size-13 shrink-0">
        <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true" className="-rotate-90">
          <circle cx="26" cy="26" r={RADIUS} fill="none" strokeWidth="6" className="stroke-chart-grid" />
          {health && <circle cx="26" cy="26" r={RADIUS} fill="none" strokeWidth="6" strokeLinecap="round" className={ring} strokeDasharray={`${((CIRCLE * percent) / 100).toFixed(1)} ${CIRCLE.toFixed(1)}`} />}
        </svg>
        <span className={cn("absolute inset-0 flex items-center justify-center font-bold text-ink tabular-nums", percent >= 100 ? "text-[11px]" : "text-[13px]")}>{health ? `${n(percent)}%` : "…"}</span>
      </span>
      <span role="status" className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
        <span className="text-[15.5px] leading-[normal] font-semibold text-ink">{title}</span>
        <span className="text-[13px] leading-[normal] text-ink-muted">{sub}</span>
      </span>
      {load === "failed" && !health && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="pointer-coarse:h-11">
          <RefreshCw />
          {t("Try again")}
        </Button>
      )}
      {health && !clean && (
        <div className="flex flex-wrap items-center gap-4">
          <div role="group" aria-label={t("Show only")} className="flex flex-wrap items-center gap-2">
            {CHIPS.filter((chip) => health[chip.key] > 0).map((chip) => {
              const on = view === chip.view;
              return (
                <button
                  key={chip.view}
                  type="button"
                  aria-pressed={on}
                  title={t(chip.tip)}
                  onClick={() => onFilter(chip.view)}
                  className={cn("flex h-8.5 items-center gap-1.5 rounded-full border px-3 text-[13px] leading-[normal] font-semibold whitespace-nowrap pointer-coarse:h-11", on ? chip.on : cn("bg-surface hover:bg-surface-sunken", chip.off))}
                >
                  <chip.icon className="size-3.25" strokeWidth={2.5} aria-hidden="true" />
                  <span className="tabular-nums">{n(health[chip.key])}</span>
                  <span>{t(chip.label)}</span>
                </button>
              );
            })}
          </div>
          <span aria-hidden="true" className="h-7 w-px bg-line max-sm:hidden" />
          <Button onClick={onFix} className="h-9.5 px-4 text-[13.5px]">
            {t("Fix them")}
            <ArrowRight className="size-3.5" strokeWidth={2.5} />
          </Button>
        </div>
      )}
    </section>
  );
}

// The list's name for a problem filter: "Reused passwords".
export const SAFETY_LIST_NAMES: Record<SafetyView, string> = { REUSED: "Reused passwords", WEAK: "Weak passwords", OLD: "Old passwords" };
