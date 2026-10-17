"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
  // Bangla labels declare their language so the Anek face is used.
  lang?: string;
  // A coloured dot before the label (Income / Expense filters).
  dot?: string;
  icon?: React.ReactNode;
}

const VARIANTS = {
  // The EN / বাংলা switch: a pill with a white thumb.
  pill: {
    group: "rounded-full bg-surface-sunken p-0.75",
    item: "h-8.5 rounded-full px-3 text-small font-semibold",
    on: "bg-surface text-ink shadow-[0_1px_2px_rgba(14,26,22,0.08)] dark:bg-surface-raised dark:shadow-[0_0_0_1px_var(--line)]",
    off: "text-ink-2 hover:text-ink",
  },
  // Filter tabs inside a toolbar.
  tabs: {
    group: "rounded-md bg-surface-sunken p-0.75",
    item: "h-8 rounded-sm px-3 text-small font-medium",
    on: "bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(11,61,46,0.14)] dark:bg-surface-raised",
    off: "text-ink-2 hover:text-ink",
  },
  // Filter tabs on a white toolbar: the chosen one goes mint (People & banks).
  soft: {
    group: "rounded-md border border-line bg-surface p-1",
    item: "h-7.5 rounded-sm px-3 text-small font-medium",
    on: "bg-mint-50 font-semibold text-emerald",
    off: "text-ink-2 hover:text-ink",
  },
  // Period tabs on white: the chosen one goes forest.
  solid: {
    group: "rounded-md border border-line bg-surface p-0.75",
    item: "h-8 rounded-sm px-3 text-small font-medium",
    on: "bg-forest font-semibold text-white dark:bg-emerald dark:text-on-action",
    off: "text-ink-2 hover:bg-surface-sunken hover:text-ink",
  },
  // On the Night drawer.
  onDark: {
    group: "rounded-full bg-white/8 p-0.75",
    item: "h-8 rounded-full px-3 text-small font-semibold",
    on: "bg-white text-ink",
    off: "text-white hover:bg-white/10",
  },
} as const;

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  variant?: keyof typeof VARIANTS;
  // "lg" stands 44px tall beside a 44px field (the Statement's Period).
  size?: "md" | "lg";
  // Fill the width, each segment equal (the drawer's Income/Expense/Transfer).
  stretch?: boolean;
  className?: string;
}

// A row of exclusive choices; one is always on.
const SegmentedControl = <T extends string>({ options, value, onChange, label, variant = "tabs", size = "md", stretch = false, className }: SegmentedControlProps<T>) => {
  const { translate } = useLocale();
  const styles = VARIANTS[variant];
  return (
    <div role="group" aria-label={translate(label)} className={cn("inline-flex gap-0.5", stretch && "flex w-full", styles.group, size === "lg" && "p-1", className)}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            lang={option.lang}
            onClick={() => onChange(option.value)}
            className={cn("inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors", styles.item, on ? styles.on : styles.off, size === "lg" && "h-9", stretch && "flex-1")}
          >
            {option.dot && <span aria-hidden="true" className="size-2 rounded-full" style={{ background: option.dot }} />}
            {option.icon}
            {typeof option.label === "string" ? translate(option.label) : option.label}
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
