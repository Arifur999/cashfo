"use client";

import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export interface TabOption<T extends string> {
  value: T;
  label: React.ReactNode;
  // A count after the label, in a small pill.
  count?: number;
}

interface TabBarProps<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  // What the tabs switch between, for screen readers.
  label: string;
  className?: string;
}

// Tabs on a line: the chosen one is underlined in emerald and carries its
// count in a mint pill (Active / Archived on My wallets), in the reader's
// digits.
const TabBar = <T extends string>({ options, value, onChange, label, className }: TabBarProps<T>) => {
  const { locale } = useLocale();
  return (
    <div role="tablist" aria-label={label} className={cn("flex gap-5 border-b border-line", className)}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(option.value)}
            className={cn("-mb-px flex h-10 items-center gap-1 border-b-2 px-1 text-body transition-colors", on ? "border-emerald font-semibold text-emerald" : "border-transparent font-medium text-ink-muted hover:text-ink")}
          >
            {option.label}
            {option.count !== undefined && <span className={cn("rounded-full px-2 py-px text-caption font-semibold tabular-nums", on ? "bg-mint-50 text-emerald" : "bg-surface-sunken text-ink-muted")}>{formatCount(option.count, locale)}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default TabBar;
