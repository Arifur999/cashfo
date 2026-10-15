"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { addTrackerItemAction } from "@/lib/customer/habitsActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface AddRowDialogProps {
  open: boolean;
  onClose: () => void;
  trackerId: string;
  existing: string[];
  // Names offered as chips.
  suggestions: string[];
  description: string;
}

// A new row on a Ramadan sheet or a challenge: a name, or one of the
// usual ones in a tap.
export function AddRowDialog({ open, onClose, trackerId, existing, suggestions, description }: AddRowDialogProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setName("");
  }
  const taken = existing.some((item) => item.toLowerCase() === name.trim().toLowerCase());
  const valid = name.trim().length > 0 && name.trim().length <= 60 && !taken;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const result = await addTrackerItemAction(trackerId, name.trim());
      if (result.success) {
        toast.success(t("Row added"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to add the row"));
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-105 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-xl border border-line bg-surface p-0 shadow-overlay ring-0">
        <form onSubmit={submit} className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
            <AlertDialogTitle className="text-h3 text-ink">{t("Add a row")}</AlertDialogTitle>
            <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-8.5 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>
          <AlertDialogDescription className="px-6 pt-4 text-small text-ink-muted">{description}</AlertDialogDescription>
          <div className="flex flex-col gap-3 px-6 py-4">
            <Field htmlFor="row-name" label={<span className="text-body font-medium text-ink">{t("Name")}</span>} error={taken ? t("That row is already on the sheet.") : undefined}>
              <Input id="row-name" size="md" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={60} invalid={taken} placeholder={t("Taraweeh")} />
            </Field>
            <div className="flex flex-wrap gap-2">
              {suggestions
                .filter((s) => !existing.includes(s))
                .map((s) => (
                  <button key={s} type="button" onClick={() => setName(s)} className={cn("h-7 rounded-full border px-3 text-caption font-semibold transition-colors", name === s ? "border-emerald bg-mint-50 text-emerald" : "border-line bg-surface text-ink-2 hover:border-line-strong")}>
                    {t(s)}
                  </button>
                ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-line bg-cream px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!valid || isPending} className="px-5">
              {isPending && <Loader />}
              {t("Add row")}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
