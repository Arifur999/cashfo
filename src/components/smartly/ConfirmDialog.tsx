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
// design's 460px dialog with the round tile, the question, and the two
// buttons. The confirm button has focus, so Enter confirms as it did with
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
        className="w-115 max-w-[calc(100vw-32px)] gap-4 rounded-lg border border-line bg-surface p-6 shadow-overlay ring-0"
      >
        <div className="flex items-start gap-4">
          <IconTile tone={danger ? "expense" : "money"} size={44}>
            {icon ?? <Trash2 />}
          </IconTile>
          <div className="flex min-w-0 flex-col gap-2">
            <AlertDialogTitle className="text-h3 text-ink">{title}</AlertDialogTitle>
            <AlertDialogDescription className="text-body leading-[21px] break-words text-ink-2">{description}</AlertDialogDescription>
          </div>
        </div>
        <div className="flex justify-end gap-3">
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
