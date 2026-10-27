"use client";

import { Trash2 } from "lucide-react";
import { useRef } from "react";
import Loader from "@/components/shared/Loader";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import Button from "./Button";
import IconTile from "./IconTile";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: React.ReactNode;
  // Names the thing and says what happens.
  description: React.ReactNode;
  // The risky button says the action ("Archive wallet"), never just "OK".
  confirmLabel: React.ReactNode;
  cancelLabel?: React.ReactNode;
  // Red for what cannot be undone; forest otherwise.
  danger?: boolean;
  icon?: React.ReactNode;
  isPending?: boolean;
}

// Confirm before anything that cannot be undone or affects money: the
// design's 480px dialog (VoidDialog) with the 44px tile, the question, and
// the two pills on the right. The confirm button has focus, so Enter confirms as it did with
// window.confirm.
const ConfirmDialog = ({ open, onClose, onConfirm, title, description, confirmLabel, cancelLabel, danger = true, icon, isPending = false }: ConfirmDialogProps) => {
  const { t } = useLocale();
  const confirmRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          confirmRef.current?.focus();
        }}
        className="w-120 max-w-[calc(100vw-32px)] gap-4.5 rounded-[14px] border-0 bg-surface p-6 shadow-overlay ring-0"
      >
        <div className="flex items-start gap-3.5">
          <IconTile tone={danger ? "expense" : "money"} size={44}>
            {icon ?? <Trash2 />}
          </IconTile>
          <div className="flex min-w-0 flex-col gap-1.5">
            <AlertDialogTitle className="text-h3 text-ink">{title}</AlertDialogTitle>
            <AlertDialogDescription className="text-body leading-[1.55] break-words text-ink-soft">{description}</AlertDialogDescription>
          </div>
        </div>
        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            {cancelLabel ?? t("Cancel")}
          </Button>
          <Button ref={confirmRef} type="button" variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={isPending}>
            {isPending && <Loader size={16} onDark label={t("Loading...")} />}
            {confirmLabel}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;
