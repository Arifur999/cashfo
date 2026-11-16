"use client";

import { useRef } from "react";
import type { BookNoteKind } from "@/lib/customer/api";
import { NOTE_KINDS } from "@/lib/customer/libraryBoard";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { paletteFor } from "./bookPalette";

// The v16 Library boards' own controls: 8px corners, 40px buttons and 42px
// fields (the LibraryHome / LibraryBooks / LibraryBook style blocks).
export const LB_BTN = "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[8px] px-4 text-body font-semibold whitespace-nowrap transition-colors disabled:cursor-default disabled:opacity-45";
export const LB_PRIMARY = cn(LB_BTN, "bg-primary text-on-action hover:bg-emerald-hover");
export const LB_OUTLINE = cn(LB_BTN, "border border-input bg-surface text-ink hover:bg-hover");
export const LB_DANGER = cn(LB_BTN, "bg-expense text-on-action hover:bg-expense/90");
// The 34px buttons under a reading card.
export const LB_SM = "inline-flex h-8.5 shrink-0 items-center gap-1.5 rounded-[8px] border px-3 text-[13px] font-semibold whitespace-nowrap transition-colors disabled:opacity-45";
export const LB_FIELD = "h-10.5 w-full rounded-[8px] border border-input bg-surface px-3 text-body text-ink outline-none placeholder:text-ink-faint focus:border-emerald focus:focus-halo aria-invalid:border-expense";
export const LB_AREA = "w-full resize-y rounded-[8px] border border-input bg-surface px-3 py-2.5 text-body leading-[1.6] text-ink outline-none placeholder:text-ink-faint focus:border-emerald focus:focus-halo aria-invalid:border-expense";
export const LB_LABEL = "text-[13.5px] font-semibold text-ink";
export const LB_ERROR = "text-[12.5px] text-expense";
export const LB_CARD = "rounded-[14px] border border-line bg-surface shadow-card";

// A cover's two colours, for a gradient or a flat block.
export const coverColors = (key: string) => {
  const palette = paletteFor(key);
  return { color: palette.from, dark: palette.to };
};

// A flat book block with its spine shaded (a list row, Up next, a popup's head).
export function Spine({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden="true" className={cn("block shrink-0 rounded-[3px_7px_7px_3px] shadow-[inset_4px_0_0_rgba(0,0,0,0.2)]", className)} style={{ background: paletteFor(color).from }} />;
}

// A drawn cover: the colour darkening down to the right, a shaded spine, the
// title at the top and the author under a short rule.
export function CoverArt({ title, author, color, className, titleClassName, authorClassName, children }: { title: string; author: string; color: string; className?: string; titleClassName?: string; authorClassName?: string; children?: React.ReactNode }) {
  const { color: from, dark } = coverColors(color);
  return (
    <div className={cn("relative box-border flex shrink-0 flex-col justify-between text-white", className)} style={{ background: `linear-gradient(155deg, ${from} 0%, ${dark} 100%)` }}>
      <span className={cn("line-clamp-4 leading-[1.3] font-bold break-words", titleClassName)}>{title}</span>
      <span className="flex flex-col gap-1.25">
        <span aria-hidden="true" className="h-0.5 w-5.5 rounded-[2px] bg-white/55" />
        <span className={cn("line-clamp-2 leading-[1.35] break-words opacity-[0.88]", authorClassName)}>{author}</span>
        {children}
      </span>
    </div>
  );
}

// A note's kind as a small pill.
export function KindChip({ kind, className }: { kind: BookNoteKind; className?: string }) {
  const { t } = useLocale();
  const info = NOTE_KINDS[kind];
  return <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap", info.soft, info.ink, className)}>{t(info.label)}</span>;
}

// The page number tile at the start of a note's row.
export function PageTile({ page, size = "md" }: { page: number | null; size?: "md" | "lg" }) {
  const { t, fmt } = useLocale();
  return (
    <span className={cn("flex flex-col items-center justify-center gap-px rounded-[10px] bg-emerald-soft", size === "lg" ? "h-15.5" : "h-14")}>
      <span className={cn("font-semibold text-emerald", size === "lg" ? "text-[11px]" : "text-[10.5px]")}>{t("Page")}</span>
      <span className={cn("leading-none font-bold text-ink tabular-nums", size === "lg" ? "text-[24px]" : "text-[21px]")}>{page === null ? "–" : formatCount(page, fmt)}</span>
    </span>
  );
}


// The boards' date box: the day in words (or a pill and a hint before and
// after it), and a click opens the browser's own date picker. The date input
// underneath keeps the value, the limits and keyboard entry.
export function DayField({ id, value, onChange, min, max, invalid, label, before, after, className }: { id?: string; value: string; onChange: (day: string) => void; min?: string; max?: string; invalid?: boolean; label: string; before?: React.ReactNode; after?: React.ReactNode; className?: string }) {
  const picker = useRef<HTMLInputElement>(null);
  function open() {
    try {
      picker.current?.showPicker();
    } catch {
      picker.current?.focus();
    }
  }
  return (
    <span onClick={open} className={cn(LB_FIELD, "relative flex cursor-pointer items-center gap-2.5 focus-within:border-emerald focus-within:focus-halo", invalid && "border-expense", className)}>
      {before}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {after}
      <input ref={picker} id={id} type="date" value={value} min={min || undefined} max={max} aria-invalid={invalid || undefined} onChange={(event) => event.target.value && onChange(event.target.value)} className="sr-only" />
    </span>
  );
}
