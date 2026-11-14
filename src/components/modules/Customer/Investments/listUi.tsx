"use client";

import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CARD } from "./investmentLook";

// The small total cards over My investments, Transactions and Statement.
export function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: string }) {
  return (
    <div className={cn(CARD, "flex min-w-0 flex-col gap-1 px-[18px] py-3.5")}>
      <span className="text-[12.5px] font-semibold text-ink-2">{label}</span>
      <span className={cn("truncate text-[20px] font-bold tabular-nums", tone)}>{value}</span>
      <span className="truncate text-[12px] text-ink-muted">{sub}</span>
    </div>
  );
}

// The pill tabs with a count after each name.
export function Tabs<T extends string>({ label, tabs, value, onChange }: { label: string; tabs: { key: T; label: string; count: number }[]; value: T; onChange: (key: T) => void }) {
  const { fmt } = useLocale();
  return (
    <div role="tablist" aria-label={label} className="flex shrink-0 gap-0.5 overflow-x-auto rounded-full border border-line bg-strip p-1 max-sm:max-w-full">
      {tabs.map((tab) => {
        const on = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(tab.key)}
            className={cn(
              "h-7.5 rounded-full px-3 text-[13px] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-(--focus-ring)",
              on ? "bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(18,32,29,0.10)]" : "font-medium text-ink-muted",
            )}
          >
            {tab.label} <span className="text-ink-faint">{formatCount(tab.count, fmt)}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SearchBox({ value, onChange, label, className }: { value: string; onChange: (value: string) => void; label: string; className?: string }) {
  return (
    <div className={cn("relative min-w-40 grow", className)}>
      <svg className="pointer-events-none absolute top-2.75 left-3 text-ink-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9.5 w-full rounded-[10px] border border-input bg-surface pr-3 pl-9 text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-emerald focus:shadow-[0_0_0_3px_var(--mint-50)]"
      />
    </div>
  );
}
