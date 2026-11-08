"use client";

import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface IEConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  message: React.ReactNode;
  // Under the message: the row it removes, where its transactions go.
  children?: React.ReactNode;
  // Already translated ("Delete", "Move and delete").
  confirmLabel: string;
  onConfirm: () => void;
  busy?: boolean;
  // Nothing can be deleted yet (the only category of its type).
  disabled?: boolean;
  // The TxnDelete and Budget boards' 420px popup, or Category Set's 440px.
  width?: 420 | 440;
}

// The Income & Expense boards' delete popup (TxnDelete, Budget's Delete,
// CategoryDelete): the question, what happens, anything the board shows
// under it, then Cancel and the red button, 44px pills on the right.
export function IEConfirmDialog({ open, onClose, title, message, children, confirmLabel, onConfirm, busy = false, disabled = false, width = 420 }: IEConfirmDialogProps) {
  const { t } = useLocale();
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn("flex max-w-[calc(100vw-32px)] flex-col rounded-card border-0 bg-surface p-6 leading-[normal] text-ink shadow-overlay ring-0", width === 440 ? "w-110 gap-3 sm:max-w-110" : "w-105 gap-2.5 sm:max-w-105")}
      >
        <DialogTitle className="text-[18px] font-semibold wrap-anywhere text-ink">{title}</DialogTitle>
        <DialogDescription className="text-body leading-normal text-ink-soft">{message}</DialogDescription>
        {children}
        <div className={cn("flex justify-end gap-2.5", width === 440 ? "mt-1.5" : "mt-2")}>
          <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={busy} className="px-4.5">
            {t("Cancel")}
          </Button>
          <Button type="button" variant="danger" size="lg" onClick={onConfirm} disabled={busy || disabled} className="px-5">
            {busy && <Loader size={16} onDark label={t("Loading...")} />}
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
