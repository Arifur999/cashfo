"use client";

import { CircleOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Textarea from "@/components/smartly/form/Textarea";
import IconTile from "@/components/smartly/IconTile";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { voidTransactionAction } from "@/lib/customer/transactionActions";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface VoidTransactionDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  transactionId: string;
  // What the row is called, so the dialog names it ("Void Groceries?").
  title: string;
  // A whole heading instead ("Void this transfer?").
  heading?: React.ReactNode;
  description?: React.ReactNode;
  // A box between the question and the reason: the transfer's wallets,
  // amount and date.
  detail?: React.ReactNode;
  // English keys for the button, the toast and the line under the reason
  // ({count} is the shortest reason).
  confirmLabel?: string;
  doneLabel?: string;
  reasonHint?: string;
  // Runs after a successful void (the list refreshes itself).
  onVoided?: () => void;
}

const MIN_REASON = 5;

// Voiding reverses the posting and keeps it in the history; the reason is
// required, as the API asks. Drawn as the design's confirm dialog with the
// reason field inside.
export function VoidTransactionDialog({
  open,
  onClose,
  businessId,
  transactionId,
  title,
  heading,
  description,
  detail,
  confirmLabel = "Void transaction",
  doneLabel = "Transaction voided",
  reasonHint = "At least {count} characters. It's saved with the transaction.",
  onVoided,
}: VoidTransactionDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const tooShort = reason.trim().length < MIN_REASON;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (tooShort || isPending) return;
    startTransition(async () => {
      const result = await voidTransactionAction(businessId, transactionId, reason.trim());
      if (result.success) {
        toast.success(t(doneLabel));
        setReason("");
        onClose();
        onVoided?.();
        router.refresh();
      } else {
        toast.error(t(result.message ?? "Failed to void transaction"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <DialogContent showCloseButton={false} className="w-120 max-w-[calc(100vw-32px)] gap-0 rounded-lg border border-line bg-surface p-6 shadow-overlay sm:max-w-120">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <IconTile tone="expense" size={44}>
              <CircleOff />
            </IconTile>
            <div className="flex min-w-0 flex-col gap-2">
              <DialogTitle className="text-h3 text-ink">{heading ?? t("Void {name}?", { name: title })}</DialogTitle>
              <DialogDescription className="text-body text-ink-2">{description ?? t("It stays in your history, crossed out, and the balances go back to what they were. Say why, so the record makes sense later.")}</DialogDescription>
            </div>
          </div>
          {detail}
          <Field htmlFor="void-reason" label={t("Reason")} hint={t(reasonHint, { count: formatCount(MIN_REASON, fmt) })}>
            <Textarea
              id="void-reason"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              autoFocus
              placeholder={t("Entered twice by mistake")}
              maxLength={200}
              className="resize-none px-3 leading-normal"
            />
          </Field>
          <div className="flex justify-end gap-3">
            {/* Not the plain Cancel: in Bangla it is the same word as Void. */}
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel@@void")}
            </Button>
            <Button type="submit" variant="danger" disabled={tooShort || isPending}>
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {t(confirmLabel)}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
