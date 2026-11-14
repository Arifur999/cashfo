"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { Glyph, IC } from "./investmentLook";

// The popups' fields (46px, 12px corners; red when wrong, a halo when focused).
export const INPUT =
  "h-11.5 w-full rounded-[12px] border bg-surface px-3 text-[14px] text-ink outline-none transition-[border-color,box-shadow] placeholder:text-ink-faint focus:border-primary-ink focus:shadow-[0_0_0_3px_var(--mint-50)] focus-within:border-primary-ink focus-within:shadow-[0_0_0_3px_var(--mint-50)]";
export const edge = (wrong: boolean | string | undefined) => (wrong ? "border-loss-ink" : "border-input");
export const LBL = "text-[13px] font-semibold text-ink-2";

export function Err({ children, className }: { children: React.ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <span role="alert" className={cn("text-[12.5px] text-loss-ink", className)}>
      {children}
    </span>
  );
}

// The taka box: the sign before a bold figure.
export function TakaInput({ value, onChange, wrong, onEnter, label, symbol }: { value: string; onChange: (value: string) => void; wrong?: boolean | string; onEnter?: () => void; label?: string; symbol: string }) {
  return (
    <span className={cn(INPUT, edge(wrong), "flex items-center gap-1.5")}>
      <span aria-hidden="true" className="text-[15px] font-semibold text-ink-faint">
        {symbol.trim()}
      </span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={label}
        aria-invalid={wrong ? true : undefined}
        value={value}
        placeholder="0"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && onEnter) {
            event.preventDefault();
            onEnter();
          }
        }}
        className="min-w-0 flex-1 border-0 bg-transparent text-[16px] font-bold text-ink tabular-nums outline-none placeholder:text-ink-faint"
      />
    </span>
  );
}

// A round pick (frequency, kind, wallet).
export function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "h-9.5 rounded-full border-[1.5px] px-3.5 text-[13.5px] font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
        on ? "border-emerald bg-primary-soft text-forest-ink" : "border-line bg-surface text-ink hover:border-mint-200",
      )}
    >
      {children}
    </button>
  );
}

export function LinkButton({ onClick, expanded, children }: { onClick: () => void; expanded?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-expanded={expanded} className="shrink-0 rounded-[6px] px-0 py-0.5 text-[13.5px] font-semibold whitespace-nowrap text-primary-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)">
      {children}
    </button>
  );
}

// The popups' frame: a title (and a line under it), the round close
// button, a scrolling body and the footer strip.
export function IvDialog({ open, onClose, width, title, sub, footer, children, bodyPad = "py-[18px]" }: { open: boolean; onClose: () => void; width: 520 | 560 | 600; title: string; sub?: string; footer: React.ReactNode; children: React.ReactNode; bodyPad?: string }) {
  const { t } = useLocale();
  const w = { 520: "w-130", 560: "w-140", 600: "w-150" }[width];
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        data-scrim="board"
        showCloseButton={false}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className={cn(
          "flex max-h-[calc(100dvh-32px)] max-w-[calc(100vw-32px)] flex-col gap-0 overflow-hidden rounded-[20px] border-0 bg-surface p-0 leading-[normal] text-ink shadow-[0_24px_60px_rgba(18,32,29,0.28)] ring-0 sm:max-w-[calc(100vw-32px)]",
          w,
        )}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-sunken pt-4 pb-3.5 pr-5 pl-6">
          <span className="flex grow flex-col gap-0.5">
            <DialogTitle className="m-0 text-[18px] font-bold! text-ink">{title}</DialogTitle>
            {sub ? <DialogDescription className="text-[12.5px] text-ink-muted">{sub}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
          </span>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-page text-ink-2 hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)">
            <Glyph d={IC.close} size={17} stroke={2.25} />
          </button>
        </div>
        <div className={cn("flex min-h-0 flex-col gap-4 overflow-y-auto px-6", bodyPad)}>{children}</div>
        <div className="flex shrink-0 items-center gap-2.5 border-t border-sunken bg-strip px-6 py-3.5">{footer}</div>
      </DialogContent>
    </Dialog>
  );
}

// A wallet with its balance, as the boards write it: "Cash · Tk 12,000".
export const walletLabel = (name: string, balance: string) => `${name} · ${balance}`;
