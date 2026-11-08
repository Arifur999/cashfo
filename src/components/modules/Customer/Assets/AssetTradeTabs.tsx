"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export type TradeKind = "purchase" | "sale";

const TABS = [
  { value: "purchase", label: "Purchase", sub: "Add an asset you bought or own", icon: ArrowDown, on: "border-2 border-expense-fill bg-expense-soft/50", ink: "text-expense" },
  { value: "sale", label: "Sale", sub: "Sell an active asset", icon: ArrowUp, on: "border-2 border-income bg-income-soft/50", ink: "text-income" },
] as const;

// Record purchase or sale's two big tabs: the red Purchase and the green
// Sale, each with what it is for.
export function AssetTradeTabs({ value, onChange }: { value: TradeKind; onChange: (next: TradeKind) => void }) {
  const { t } = useLocale();
  return (
    <div role="tablist" aria-label={t("Transaction type")} className="grid grid-cols-2 gap-2.5">
      {TABS.map((tab) => {
        const on = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => !on && onChange(tab.value)}
            className={cn("flex h-14 items-center justify-center gap-2 rounded-[12px] px-2 outline-none focus-visible:ring-2 focus-visible:ring-emerald", on ? tab.on : "border border-input bg-surface hover:bg-surface-sunken/60")}
          >
            <tab.icon className={cn("size-4 shrink-0", tab.ink)} aria-hidden="true" />
            <span className="flex min-w-0 flex-col items-start">
              <span className={cn("text-[15px] font-semibold", on ? "text-ink" : "text-ink-2")}>{t(tab.label)}</span>
              <span className="truncate text-[12px] text-ink-muted max-sm:hidden">{t(tab.sub)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
