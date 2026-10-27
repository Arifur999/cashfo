"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
  // Bangla labels declare their language so the Bangla face is used.
  lang?: string;
  // A coloured dot before the label (Income / Expense filters).
  dot?: string;
  icon?: React.ReactNode;
}

const VARIANTS = {
  // The EN / বাংলা switch: a pill with a white thumb. Its Bangla label is
  // set a size up and lighter, as the boards draw it.
  pill: {
    group: "rounded-full bg-surface-sunken p-0.75",
    item: "h-8.5 rounded-full px-3 text-small font-semibold [&[lang=bn]]:text-body [&[lang=bn]]:font-medium",
    on: "bg-surface text-ink shadow-[0_1px_2px_rgba(14,26,22,0.08)] dark:bg-surface-raised dark:shadow-[0_0_0_1px_var(--line-strong)]",
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
    // The page's green focus ring hardly shows on the night panel; mint does.
    item: "h-8 rounded-full px-3 text-small font-semibold focus-visible:outline-mint-200 focus-visible:-outline-offset-2 [&[lang=bn]]:text-body [&[lang=bn]]:font-normal",
    on: "bg-white text-ink",
    off: "text-white hover:bg-white/10",
  },
} as const;

export type SegmentVariant = keyof typeof VARIANTS;

// "touch" makes 34px segments for a phone page's tabs (Loans); "lg" stands
// 44px tall beside a 44px field (the Statement's Period); "coarse" keeps
// md's size for a mouse and grows to 44px under a finger.
export type SegmentSize = "md" | "touch" | "lg" | "coarse";

const SIZES: Record<SegmentSize, string | undefined> = {
  md: undefined,
  touch: "h-8.5",
  lg: "h-9",
  coarse: "pointer-coarse:h-11",
};

interface SegmentLook {
  variant?: SegmentVariant;
  size?: SegmentSize;
  // The chosen segment.
  on?: boolean;
  stretch?: boolean;
}

// One segment's classes. Exported for an element of the page's own that
// sits in the row as one more segment (the trailing slot), a popover's
// trigger, say; give it the same variant and size as the control.
export const segmentClassName = ({ variant = "tabs", size = "md", on = false, stretch = false }: SegmentLook = {}) => {
  const styles = VARIANTS[variant];
  return cn("inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors", styles.item, on ? styles.on : styles.off, SIZES[size], stretch && "flex-1");
};

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  variant?: SegmentVariant;
  size?: SegmentSize;
  // Fill the width, each segment equal (the drawer's Income/Expense/Transfer).
  stretch?: boolean;
  // Nothing can be picked for now (a reminder's channel before it has a
  // day): the segments are off and the control fades.
  disabled?: boolean;
  // After the segments, inside the group: the page's own element drawn as
  // one more segment with segmentClassName() (a Custom range's popover
  // trigger after 7 / 30 / 90 days). Its on state is the page's to show:
  // pass a value no option has while it is the one in force.
  trailing?: React.ReactNode;
  className?: string;
}

// A row of exclusive choices; one is always on.
const SegmentedControl = <T extends string>({ options, value, onChange, label, variant = "tabs", size = "md", stretch = false, disabled = false, trailing, className }: SegmentedControlProps<T>) => {
  const { translate } = useLocale();
  const styles = VARIANTS[variant];
  return (
    <div role="group" aria-label={translate(label)} className={cn("inline-flex gap-0.5", stretch && "flex w-full", styles.group, size === "lg" && "p-1", disabled && "opacity-60", className)}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            lang={option.lang}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(segmentClassName({ variant, size, on, stretch }), disabled && "pointer-events-none")}
          >
            {option.dot && <span aria-hidden="true" className="size-2 rounded-full" style={{ background: option.dot }} />}
            {option.icon}
            {typeof option.label === "string" ? translate(option.label) : option.label}
          </button>
        );
      })}
      {trailing}
    </div>
  );
};

export default SegmentedControl;
