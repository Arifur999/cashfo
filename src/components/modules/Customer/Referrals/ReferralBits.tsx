"use client";

import { toast } from "sonner";
import { methodColor, methodLogo, methodTile, type ChipTone } from "@/lib/customer/referralDisplay";
import type { MethodSnapshot } from "@/lib/customer/referralTypes";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// The chips of the referral boards: a pale fill, the tone's words, and a
// 6px dot in front.
const CHIP: Record<ChipTone, { chip: string; dot: string }> = {
  neutral: { chip: "bg-surface-sunken text-ink-soft", dot: "bg-ink-faint" },
  warning: { chip: "bg-warning-soft text-warning", dot: "bg-warning-fill" },
  mint: { chip: "bg-mint-50 text-emerald", dot: "bg-emerald" },
  expense: { chip: "bg-expense-soft text-expense", dot: "bg-expense-fill" },
  info: { chip: "bg-info-soft text-info", dot: "bg-info" },
  // Under check: held back by an admin for a second look.
  check: { chip: "bg-orange-soft text-orange", dot: "bg-orange-fill" },
  // Paid out: the primary on its faint tint.
  paid: { chip: "bg-emerald-soft text-emerald", dot: "bg-emerald" },
};

interface StatusChipProps {
  tone: ChipTone;
  children: React.ReactNode;
  // The phone list's chip has no dot and 11px words.
  dot?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function StatusChip({ tone, children, dot = true, size = "sm", className }: StatusChipProps) {
  const look = CHIP[tone];
  return (
    <span className={cn("inline-flex w-fit items-center gap-1.25 rounded-full font-semibold whitespace-nowrap", size === "md" ? "px-2.25 py-0.5 text-caption" : "px-2 py-0.5 text-[11.5px] leading-normal", look.chip, className)}>
      {dot && <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", look.dot)} />}
      {children}
    </span>
  );
}

const TILE_SIZES = {
  // The Withdrawals table's "To" column.
  chip: "h-5.5 min-w-5.5 rounded-[6px] px-1.5 text-[9.5px]",
  // The saved methods list.
  md: "h-9 w-10 rounded-[9px] text-[10px]",
  // The withdraw page's choices.
  lg: "size-10 rounded-[10px] text-[11px] tracking-[-0.02em]",
  // The drawer's type cards.
  type: "h-5.5 rounded-[6px] px-1.75 text-[10px]",
} as const;

// A payout method's mark: bKash, Nagad and Rocket in their own colours, a
// bank as its short name on the quiet tile.
export function MethodTile({ method, size = "md", className }: { method: Pick<MethodSnapshot, "type" | "bankName">; size?: keyof typeof TILE_SIZES; className?: string }) {
  return (
    <span aria-hidden="true" style={{ backgroundColor: methodColor(method) }} className={cn("flex shrink-0 items-center justify-center leading-none font-extrabold whitespace-nowrap", TILE_SIZES[size], methodTile(method), className)}>
      {methodLogo(method)}
    </span>
  );
}

// The withdraw page's numbered step heads.
export function StepNumber({ n }: { n: number }) {
  const { fmt } = useLocale();
  return (
    <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald text-caption font-bold text-on-action">
      {formatCount(n, fmt)}
    </span>
  );
}

// Copy a text and say so; a refused clipboard says how to do it by hand.
export function useCopy() {
  const { t } = useLocale();
  return async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(done);
    } catch {
      toast.error(t("Couldn't copy. Select the text and copy it yourself."));
    }
  };
}
