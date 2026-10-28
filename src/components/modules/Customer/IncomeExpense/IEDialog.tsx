"use client";

import { Check, X } from "lucide-react";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface IEDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  // For screen readers: what the popup is for.
  description?: string;
  // The design's 500px popup, or 540px for a transaction.
  width?: "md" | "lg";
  // A call is out: the popup can't be closed and the save button spins.
  busy?: boolean;
  saveLabel: string;
  saveDisabled?: boolean;
  onSubmit: () => void;
  children: React.ReactNode;
}

// The Income & Expense popups (design: TxnDrawer, CategoryDrawer,
// BudgetDialog): the title and a close button over a line, the fields, and
// Cancel and the save button under a line, near the top of the screen.
export function IEDialog({ open, onClose, title, description, width = "md", busy = false, saveLabel, saveDisabled = false, onSubmit, children }: IEDialogProps) {
  const { t } = useLocale();
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "top-[max(16px,12vh)] max-h-[calc(100dvh-32px)] translate-y-0 gap-0 overflow-y-auto rounded-[20px] border-0 bg-surface p-0 text-ink shadow-overlay ring-0 sm:max-w-none",
          width === "lg" ? "w-135" : "w-125",
        )}
      >
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy && !saveDisabled) onSubmit();
          }}
          className="flex flex-col"
        >
          <div className="flex items-center justify-between gap-3 border-b border-divider py-4 pr-4 pl-6">
            <DialogTitle className="text-[18px] font-semibold text-ink">{title}</DialogTitle>
            {description && <DialogDescription className="sr-only">{description}</DialogDescription>}
            <button type="button" onClick={onClose} disabled={busy} aria-label={t("Close")} className="flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken disabled:opacity-50">
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex flex-col gap-4.5 px-6 py-5">{children}</div>
          <div className="flex justify-end gap-2.5 border-t border-divider px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy} className="rounded-full px-4.5">
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={busy || saveDisabled} className="rounded-full px-5">
              {busy && <Loader size={16} onDark label={t("Loading...")} />}
              {t(saveLabel)}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// The two kinds as the design's cards: the kind's arrow on its tint, its
// name and line, a tick when picked.
export function KindCards<K extends string>({
  legend,
  value,
  onChange,
  options,
  compact = false,
}: {
  legend: string;
  value: K;
  onChange: (value: K) => void;
  options: { value: K; label: string; sub?: string; icon: React.ReactNode; tone: "income" | "expense" | "info" }[];
  compact?: boolean;
}) {
  const { t } = useLocale();
  const TONE = {
    income: { on: "border-2 border-income bg-income-soft", text: "text-income", tile: "bg-income-soft text-income" },
    expense: { on: "border-2 border-expense bg-expense-soft", text: "text-expense", tile: "bg-expense-soft text-expense" },
    info: { on: "border-2 border-info bg-info-soft", text: "text-info", tile: "bg-info-soft text-info" },
  } as const;
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-2 text-body font-medium text-ink">{t(legend)}</legend>
      <div className={cn("grid gap-2.5", options.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {options.map((option) => {
          const on = option.value === value;
          const tone = TONE[option.tone];
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex min-w-0 items-center rounded-[12px] font-semibold transition-colors",
                compact ? "h-13 justify-center gap-2 text-[15px]" : "h-19 gap-3 px-4 text-left",
                on ? tone.on : "border border-input bg-surface text-ink-2 hover:bg-hover",
              )}
            >
              {compact ? (
                <>
                  <span className={cn("[&_svg]:size-4", tone.text)}>{option.icon}</span>
                  <span className={on ? tone.text : undefined}>{t(option.label)}</span>
                </>
              ) : (
                <>
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[10px] [&_svg]:size-4.5", on ? "bg-surface" : tone.tile, tone.text)}>{option.icon}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={cn("text-[15px]", on ? tone.text : "text-ink")}>{t(option.label)}</span>
                    {option.sub && <span className="text-caption font-normal text-ink-muted">{t(option.sub)}</span>}
                  </span>
                  {on && <Check className={cn("size-4.5 shrink-0", tone.text)} strokeWidth={2.5} aria-hidden="true" />}
                </>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
