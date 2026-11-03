"use client";

import type { LucideIcon } from "lucide-react";
import { useRef } from "react";
import Loader from "@/components/shared/Loader";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface PlanModalProps {
  open: boolean;
  onClose: () => void;
  icon: LucideIcon;
  tone: "mint" | "amber";
  title: string;
  body: string;
  // The quiet button on the left (Stay here, Keep my plan).
  second: string;
  // The forest button: an action, or a link elsewhere.
  main: { label: string; onClick: () => void; busy?: boolean };
}

// The Plans page's centred question (UpgradePlan board's modals): the trial
// that just started, or cancelling the plan.
export function PlanModal({ open, onClose, icon: Icon, tone, title, body, second, main }: PlanModalProps) {
  const { t } = useLocale();
  const secondRef = useRef<HTMLButtonElement>(null);
  const pill = "flex h-11 items-center gap-2 rounded-full px-5 text-body font-semibold whitespace-nowrap transition-colors disabled:opacity-60";
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !main.busy && onClose()}>
      <AlertDialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          secondRef.current?.focus();
        }}
        className="flex w-115 max-w-[calc(100vw-32px)] flex-col gap-3.5 rounded-[22px] border-0 bg-surface px-6.5 pt-6.5 pb-5.5 shadow-overlay ring-0"
      >
        <span aria-hidden="true" className={cn("flex size-12 items-center justify-center rounded-full [&_svg]:size-6", tone === "mint" ? "bg-mint-50 text-emerald" : "bg-warning-soft text-warning")}>
          <Icon strokeWidth={2.2} />
        </span>
        <AlertDialogTitle className="text-[20px] leading-[1.3] font-semibold tracking-[-0.01em] text-ink">{title}</AlertDialogTitle>
        <AlertDialogDescription className="text-body leading-[1.55] text-ink-soft">{body}</AlertDialogDescription>
        <div className="mt-1.5 flex justify-end gap-2">
          <button ref={secondRef} type="button" onClick={onClose} disabled={main.busy} className={cn(pill, "border border-input bg-surface px-4.5 text-ink hover:bg-surface-sunken")}>
            {second}
          </button>
          <button type="button" onClick={main.onClick} disabled={main.busy} className={cn(pill, "bg-forest text-white hover:bg-forest-hover")}>
            {main.busy && <Loader size={14} onDark label={t("Loading...")} />}
            {main.label}
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
