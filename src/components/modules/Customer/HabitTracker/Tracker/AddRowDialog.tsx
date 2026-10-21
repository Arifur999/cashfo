"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MAX_BACKFILL_DAYS } from "@/lib/customer/challengeDisplay";
import { actionError } from "@/lib/customer/habitDisplay";
import { addChallengeItemAction, addTrackerItemAction } from "@/lib/customer/habitsActions";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CloseButton, PanelFooter } from "./PanelParts";

interface AddRowDialogProps {
  open: boolean;
  onClose: () => void;
  trackerId: string;
  existing: string[];
  // Names offered as chips.
  suggestions: string[];
  description: string;
  // A challenge counts a day done when every item is ticked: the days
  // already done get the new item ticked too, so none of them turns missed.
  // replaceDayItem: it was ticked through the day itself until now.
  challenge?: { doneDays: number[]; replaceDayItem: boolean };
}

// A new row on a Ramadan sheet or a challenge: a name, or one of the
// usual ones in a tap.
export function AddRowDialog({ open, onClose, trackerId, existing, suggestions, description, challenge }: AddRowDialogProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setName("");
  }
  // A suggestion is saved under its English name, as the sheet words it
  // (and as the server finds the Quran row), whatever language it shows in.
  const saved = suggestions.find((s) => s === name.trim() || t(s) === name.trim()) ?? name.trim();
  const typed = saved.normalize("NFC").toLowerCase();
  const taken = existing.some((item) => item.normalize("NFC").toLowerCase() === typed);
  const valid = typed.length > 0 && saved.length <= 40 && !taken;
  const doneDays = challenge?.doneDays ?? [];
  // Too many done days to tick the new row on (each tick is a request):
  // nothing to add until the server can tick them at once.
  const tooLong = doneDays.length > MAX_BACKFILL_DAYS;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || tooLong || isPending) return;
    startTransition(async () => {
      const result = challenge ? await addChallengeItemAction(trackerId, { name: saved, doneDays, replaceDayItem: challenge.replaceDayItem }) : await addTrackerItemAction(trackerId, saved);
      if (result.success) {
        toast.success(t("Row added"));
        onClose();
      } else {
        toast.error(actionError(result.message, "Failed to add the row", t, locale));
      }
      // Whatever happened, the sheet as the server now has it (a refusal
      // whose rollback failed too leaves the row there).
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-105 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-xl border border-line bg-surface p-0 shadow-overlay ring-0">
        <form onSubmit={submit} className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
            <AlertDialogTitle className="text-h3 text-ink">{t("Add a row")}</AlertDialogTitle>
            <CloseButton onClick={onClose} label={t("Close")} />
          </div>
          <AlertDialogDescription className="flex flex-col gap-2 px-6 pt-4 text-small text-ink-muted">
            <span>{description}</span>
            {tooLong ? (
              <span className="rounded-md bg-warning-soft px-3 py-2 font-medium text-warning">{t("This challenge has more than {count} days done, too many to tick a new row on. Start a new challenge for it instead.", { count: formatCount(MAX_BACKFILL_DAYS, locale) })}</span>
            ) : (
              doneDays.length > 0 && <span className="text-ink-2">{t(doneDays.length === 1 ? "The day already done gets it ticked too, so it stays done." : "The {count} days already done get it ticked too, so they stay done.", { count: formatCount(doneDays.length, locale) })}</span>
            )}
          </AlertDialogDescription>
          <div className="flex flex-col gap-3 px-6 py-4">
            <Field htmlFor="row-name" label={<span className="text-body font-medium text-ink">{t("Name")}</span>} error={taken ? t("That row is already on the sheet.") : undefined}>
              <Input id="row-name" size="md" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={40} invalid={taken} disabled={tooLong} placeholder={t(suggestions[0] ?? "No sweets")} />
            </Field>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestions
                  .filter((s) => !existing.includes(s))
                  .map((s) => (
                    <button key={s} type="button" aria-pressed={name === t(s)} onClick={() => setName(t(s))} className={cn("h-7 rounded-full border px-3 text-caption font-semibold transition-colors pointer-coarse:h-11", name === t(s) ? "border-emerald bg-mint-50 text-brand-ink" : "border-line bg-surface text-ink-2 hover:border-line-strong")}>
                      {t(s)}
                    </button>
                  ))}
              </div>
            )}
          </div>
          <PanelFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!valid || tooLong || isPending} className="px-5">
              {isPending && <Loader />}
              {t("Add row")}
            </Button>
          </PanelFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
