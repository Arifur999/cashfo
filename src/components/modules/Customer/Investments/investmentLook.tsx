import type { InvestmentStatus } from "@/lib/customer/investmentDisplay";
import type { InvestmentEntryType, InvestmentFrequency, InvestmentKind } from "@/lib/customer/investmentTypes";
import { cn } from "@/lib/utils";

// The InvestApp board's glyphs (lucide paths), drawn as it draws them.
export const IC = {
  coins: "M8 8a6 6 0 1 0 0 12 6 6 0 1 0 0-12z M18.09 10.37A6 6 0 1 1 10.34 18 M7 6h1v4 M16.71 13.88l.7.71-2.82 2.82",
  trend: "M22 7 13.5 15.5 8.5 10.5 2 17 M16 7h6v6",
  edit: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
  trash: "M3 6h18 M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6 M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",
  lock: "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z M7 11V7a5 5 0 0 1 10 0v4",
  plus: "M5 12h14 M12 5v14",
  back: "M9 14 4 9l5-5 M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5 5.5 5.5 0 0 1-5.5 5.5H11",
  down: "M22 17 13.5 8.5 8.5 13.5 2 7 M16 17h6v-6",
  file: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z M14 2v4a2 2 0 0 0 2 2h4 M16 13H8 M16 17H8",
  check: "M20 6 9 17l-5-5",
  clock: "M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z M12 6v6l4 2",
  alert: "M12 8v4 M12 16h.01",
  open: "M15 3h6v6 M10 14 21 3 M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
  wallet: "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1 M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",
  calendar: "M8 2v4 M16 2v4 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M3 10h18",
  sort: "m3 16 4 4 4-4 M7 20V4 M11 4h10 M11 8h7 M11 12h4",
  close: "M18 6 6 18M6 6l12 12",
};

export function Glyph({ d, size = 16, stroke = 2, className }: { d: string; size?: number; stroke?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn("shrink-0", className)}>
      <path d={d} />
    </svg>
  );
}

// Each kind's long and short name (dictionary keys), glyph and tint.
export const KIND_LOOK: Record<InvestmentKind, { label: string; short: string; icon: string; tile: string }> = {
  BUSINESS: { label: "Business / partnership", short: "Business@@investment", icon: "M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16 M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z", tile: "bg-mint-50 text-emerald" },
  SANCHAYAPATRA: { label: "Sanchayapatra / bond", short: "Sanchayapatra", icon: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z M14 2v4a2 2 0 0 0 2 2h4 M16 13H8 M16 17H8 M10 9H8", tile: "bg-warning-soft text-due-ink" },
  FDR: { label: "Bank FDR, profit paid out", short: "Bank FDR", icon: "M3 22h18 M6 18v-7 M10 18v-7 M14 18v-7 M18 18v-7 M12 2l8 5H4z", tile: "bg-tint-blue text-tint-blue-ink" },
  SHARES: { label: "Shares / mutual fund", short: "Shares", icon: "M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z M21.21 15.89A10 10 0 1 1 8 2.83", tile: "bg-tint-violet text-tint-violet-ink" },
  PROPERTY: { label: "Rent / property", short: "Property", icon: "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8 M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", tile: "bg-tint-pink text-tint-pink-ink" },
  OTHER: { label: "Something else", short: "Other@@investment", icon: "M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z M12 11a1 1 0 1 0 0 2 1 1 0 1 0 0-2z", tile: "bg-quiet-chip text-ink-2" },
};

export function KindTile({ kind, size = 40 }: { kind: InvestmentKind; size?: 36 | 38 | 40 | 48 }) {
  const look = KIND_LOOK[kind];
  const box = { 36: "size-9 rounded-[10px]", 38: "size-9.5 rounded-[11px]", 40: "size-10 rounded-[12px]", 48: "size-12 rounded-[14px]" }[size];
  return (
    <span className={cn("flex shrink-0 items-center justify-center", box, look.tile)}>
      <Glyph d={look.icon} size={size === 48 ? 22 : size === 40 ? 18 : 17} />
    </span>
  );
}

// An entry type's chip.
export const ENTRY_LOOK: Record<InvestmentEntryType, { label: string; chip: string }> = {
  INVEST: { label: "Invested", chip: "bg-tint-teal text-note-ink" },
  ADD: { label: "Invested more", chip: "bg-tint-teal text-note-ink" },
  PROFIT: { label: "Profit@@investment", chip: "bg-tint-green text-tint-green-ink" },
  BACK: { label: "Capital back", chip: "bg-tint-blue text-tint-blue-ink" },
  LOSS: { label: "Loss", chip: "bg-expense-soft text-loss-ink" },
};

export const STATUS_CHIP: Record<InvestmentStatus, string> = {
  late: "bg-expense-soft text-loss-ink",
  soon: "bg-warning-soft text-warning",
  ok: "bg-tint-green text-tint-green-ink",
  open: "bg-quiet-chip text-ink-2",
  matured: "bg-tint-blue text-tint-blue-ink",
  closed: "bg-slate-soft text-slate-ink",
};

// [label, the per-payout words]
export const FREQUENCY_WORDS: Record<InvestmentFrequency, { label: string; each: string }> = {
  MONTHLY: { label: "Monthly", each: "a month" },
  QUARTERLY: { label: "Every 3 months", each: "every 3 months" },
  HALF_YEARLY: { label: "Every 6 months", each: "every 6 months" },
  YEARLY: { label: "Yearly", each: "a year" },
  IRREGULAR: { label: "Not fixed@@investment", each: "" },
};

export function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex h-5.5 shrink-0 items-center rounded-full px-2.25 text-[11.5px] font-semibold whitespace-nowrap", className)}>{children}</span>;
}

// The board's card, buttons and icon button.
export const CARD = "rounded-[18px] border border-line-card bg-surface shadow-[0_1px_2px_rgba(18,32,29,0.04),0_6px_20px_rgba(18,32,29,0.05)]";
const BTN = "inline-flex h-10 shrink-0 items-center gap-1.75 rounded-full px-4 text-[14px] font-semibold whitespace-nowrap transition-[filter,background-color,border-color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) disabled:opacity-60";
export const BTN_PRIMARY = cn(BTN, "border-0 bg-emerald text-on-action shadow-[0_1px_2px_rgba(18,32,29,0.10)] hover:brightness-110");
export const BTN_SECONDARY = cn(BTN, "border border-input bg-surface text-ink hover:border-mint-200 hover:bg-pick-wash");
export const BTN_GHOST = "h-11 rounded-full px-4 text-[14px] font-semibold text-ink-2 hover:bg-quiet-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) disabled:opacity-60";
export const ICON_BTN =
  "inline-flex size-8.5 shrink-0 items-center justify-center rounded-[9px] border border-line bg-surface text-ink-muted transition-colors hover:border-mint-200 hover:bg-pick-wash hover:text-emerald hover:shadow-[0_1px_2px_rgba(18,32,29,0.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)";
export const NAME_LINK = "truncate text-ink no-underline hover:text-emerald hover:underline";
