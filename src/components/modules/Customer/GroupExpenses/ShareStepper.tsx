"use client";

import { Minus, Plus } from "lucide-react";
import { mealText } from "@/lib/customer/groupMeals";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface ShareStepperProps {
  value: number;
  onChange: (next: number) => void;
  // Whose units these are, for the buttons' names.
  name?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

const STEP = 0.5;
const MIN = 0.5;
const MAX = 100;

// A member's share units, the one stepper every screen uses: half a share
// at a time, from ½ to 100, so a bigger room can pay 1.5 anywhere. The
// figure is a live region, so a screen reader hears it after each press.
export function ShareStepper({ value, onChange, name, disabled = false, size = "md" }: ShareStepperProps) {
  const { t, fmt } = useLocale();
  const set = (next: number) => onChange(Math.min(MAX, Math.max(MIN, Math.round(next / STEP) * STEP)));
  const button = cn("flex h-full items-center justify-center bg-strip text-ink-soft transition-colors hover:bg-surface-sunken disabled:opacity-40 pointer-coarse:w-11", size === "sm" ? "w-7" : "w-8");
  return (
    <span className={cn("flex shrink-0 items-center overflow-hidden rounded-sm border border-input", size === "sm" ? "h-8 pointer-coarse:h-11" : "h-9 pointer-coarse:h-11")}>
      <button type="button" aria-label={name ? t("Fewer shares for {name}", { name }) : t("Fewer share units")} disabled={disabled || value <= MIN} onClick={() => set(value - STEP)} className={button}>
        <Minus className="size-3" strokeWidth={2.5} aria-hidden="true" />
      </button>
      <span aria-live="polite" className={cn("text-center font-semibold tabular-nums", size === "sm" ? "w-8 text-body" : "w-8.5 text-[15px] leading-normal font-bold")}>
        <span className="sr-only">{name ? t("{name}'s share units:", { name }) : t("Share units:")} </span>
        {mealText(value, fmt)}
      </span>
      <button type="button" aria-label={name ? t("More shares for {name}", { name }) : t("More share units")} disabled={disabled || value >= MAX} onClick={() => set(value + STEP)} className={button}>
        <Plus className="size-3" strokeWidth={2.5} aria-hidden="true" />
      </button>
    </span>
  );
}
