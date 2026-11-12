"use client";

import { Trash2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface LoanDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  body: React.ReactNode;
  // Something can go: the red Delete. Otherwise the amber warning, Close
  // and, when there is one, where to go instead.
  onConfirm?: () => void;
  confirmLabel?: string;
  busy?: boolean;
  instead?: { href: string; label: string };
}

// The loan boards' delete popup (LoanContacts, LoanTransactions): a 46px
// tile, the question, what changes, then Cancel and Delete -- or, when it
// can't go, why and the way round it.
export function LoanDeleteDialog({ open, onClose, title, body, onConfirm, confirmLabel, busy = false, instead }: LoanDeleteDialogProps) {
  const { t } = useLocale();
  const blocked = !onConfirm;
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent showCloseButton={false} role="alertdialog" className="flex w-110 max-w-[calc(100vw-32px)] flex-col gap-3.5 rounded-[20px] border-0 bg-surface p-6 leading-[normal] text-ink shadow-overlay ring-0 sm:max-w-110">
        <span aria-hidden="true" className={cn("flex size-11.5 items-center justify-center rounded-[14px]", blocked ? "bg-warning-soft text-warning" : "bg-expense-soft text-expense-fill")}>
          {blocked ? <TriangleAlert className="size-5.5" strokeWidth={2} /> : <Trash2 className="size-5.5" strokeWidth={2} />}
        </span>
        <DialogTitle className="text-[18px] font-bold wrap-anywhere text-ink">{title}</DialogTitle>
        <DialogDescription className="text-[13.5px] leading-[1.55] text-ink-soft">{body}</DialogDescription>
        <div className="mt-1 flex flex-wrap justify-end gap-2.5">
          <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={busy} className="px-4.5">
            {blocked ? t("Close") : t("Cancel")}
          </Button>
          {onConfirm && (
            <Button type="button" variant="danger" size="lg" onClick={onConfirm} disabled={busy} className="px-5">
              {busy && <Loader size={16} onDark label={t("Loading...")} />}
              {confirmLabel}
            </Button>
          )}
          {blocked && instead && (
            <Button asChild size="lg" className="px-5">
              <Link href={instead.href}>{instead.label}</Link>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
