"use client";

import { X } from "lucide-react";
import { useState, useTransition } from "react";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { remindFriendsAction } from "@/lib/customer/referralActions";
import { dayOf, friendDay } from "@/lib/customer/referralDisplay";
import type { FriendRow } from "@/lib/customer/referralTypes";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface RemindDialogProps {
  open: boolean;
  // Friends who signed up and haven't paid.
  friends: FriendRow[];
  onClose: () => void;
  // How many got a reminder, out of how many were ticked.
  onSent: (sent: number, asked: number) => void;
  today: string;
}

// "Send a friendly reminder": tick who gets it; each gets a note in their
// Smartly bell with their discount, at most once a week. Their phone and
// email stay theirs: nothing goes to them from the member.
export function RemindDialog({ open, friends, onClose, onSent, today }: RemindDialogProps) {
  const { t, fmt } = useLocale();
  const [off, setOff] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const picked = friends.filter((friend) => !off.has(friend.id));

  function send() {
    if (picked.length === 0) {
      setError(t("Tick at least one friend."));
      return;
    }
    startTransition(async () => {
      const result = await remindFriendsAction(picked.map((friend) => friend.id)).catch(() => null);
      if (result?.success && result.data) {
        setOff(new Set());
        setError(null);
        onSent(result.data.sent, picked.length);
      } else setError(t(result?.message ?? "Couldn't send the reminder."));
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent showCloseButton={false} className="w-110 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-[20px] border-0 bg-surface p-0 shadow-overlay ring-0">
        <div className="flex items-start justify-between gap-3 px-6 pt-5">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-h3 text-ink">{t("Send a friendly reminder")}</DialogTitle>
            <DialogDescription className="text-small text-ink-muted">{t("They get a note in Smartly with their discount. One reminder a week at most.")}</DialogDescription>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="-mt-1 -mr-2 flex size-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </div>
        <fieldset className="flex max-h-72 flex-col gap-2 overflow-y-auto px-6 py-4">
          <legend className="sr-only">{t("Send to")}</legend>
          {friends.map((friend) => (
            <label key={friend.id} className="flex cursor-pointer items-center gap-3 rounded-field border border-line px-3.5 py-2.5 hover:border-line-strong">
              <Checkbox
                checked={!off.has(friend.id)}
                onCheckedChange={(next) =>
                  setOff((current) => {
                    const copy = new Set(current);
                    if (next === true) copy.delete(friend.id);
                    else copy.add(friend.id);
                    return copy;
                  })
                }
                className="size-4.5 rounded-[5px] border-[1.5px] border-ink-faint"
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-body font-semibold text-ink">{friend.name}</span>
                <span className="text-caption text-ink-muted">{t("Joined {date}", { date: friendDay(dayOf(friend.joinedAt), today, fmt) })}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {error && (
          <p role="alert" className="mx-6 mb-3 rounded-field bg-expense-soft px-3.5 py-2.5 text-small text-expense">
            {error}
          </p>
        )}
        <div className="flex items-center justify-end gap-2.5 border-t border-line bg-strip px-6 py-3.5">
          <Button variant="secondary" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button onClick={send} disabled={isPending}>
            {isPending && <Loader size={16} onDark label={t("Loading...")} />}
            {t("Send reminder")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
