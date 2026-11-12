"use client";

import { Check } from "lucide-react";
import { useId } from "react";
import { colorName, GOAL_COLORS } from "@/lib/customer/savingsColors";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// The Savings boards' Card colour row: the label with the colour's name in
// it, and the thirteen swatches as radios.
// stacked: the savings account form's look, the label and name over the row.
export function ColorRow({ value, onChange, size = 28, stacked = false, className }: { value: string; onChange: (hex: string) => void; size?: 26 | 28; stacked?: boolean; className?: string }) {
  const { t } = useLocale();
  const id = useId();
  const name = colorName(value);
  return (
    <div className={cn(stacked ? "flex flex-col gap-2" : "flex items-center gap-3", className)}>
      <span id={id} className={stacked ? "flex items-baseline justify-between gap-2" : "flex w-21 shrink-0 flex-col gap-px"}>
        <span className={stacked ? "text-body font-medium text-ink" : "text-[13px] font-semibold text-ink-2"}>{t("Card colour")}</span>
        <span className={cn("font-semibold", stacked ? "text-[12px]" : "text-[11.5px]")} style={{ color: name ? value : "var(--ink-faint)" }}>
          {name ? t(name) : t("Pick one")}
        </span>
      </span>
      <div role="radiogroup" aria-labelledby={id} className={cn("flex min-w-0 flex-1 flex-wrap items-center justify-between py-1 pr-1 sm:flex-nowrap", stacked ? "gap-1 pl-0.5" : "gap-1.5")}>
        {GOAL_COLORS.map((color) => {
          const on = value.toLowerCase() === color.hex;
          return (
            <button
              key={color.hex}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={t(color.name)}
              title={t(color.name)}
              onClick={() => onChange(color.hex)}
              className={cn("flex shrink-0 items-center justify-center rounded-full p-0 text-white transition-shadow", size === 28 ? "size-7" : "size-6.5")}
              style={{
                background: `radial-gradient(circle at 32% 28%, rgb(255 255 255 / 0.28) 0, transparent 55%), ${color.hex}`,
                boxShadow: on ? `0 0 0 2px var(--surface), 0 0 0 4px ${color.hex}, 0 4px 10px -2px color-mix(in srgb, ${color.hex} 50%, transparent)` : "inset 0 0 0 1px rgb(255 255 255 / 0.12), 0 1px 3px rgb(18 32 29 / 0.18)",
              }}
            >
              {on && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
