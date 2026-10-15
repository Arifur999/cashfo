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
import { CHALLENGE_PRESETS } from "@/lib/customer/challengeDisplay";
import { addTrackerItemAction, createCustomTrackerAction } from "@/lib/customer/habitsActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface NewChallengeDialogProps {
  open: boolean;
  onClose: () => void;
  // The length picked on the page, if any.
  presetDays: number | null;
}

// A new challenge: a name, how many days, and the daily items to tick
// (one is enough; none means the day itself is ticked).
export function NewChallengeDialog({ open, onClose, presetDays }: NewChallengeDialogProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [days, setDays] = useState<number | "custom">(30);
  const [custom, setCustom] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? String(presetDays ?? "default") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setName("");
      setDays(presetDays && CHALLENGE_PRESETS.some((p) => p.days === presetDays) ? presetDays : presetDays ? "custom" : 30);
      setCustom(presetDays && !CHALLENGE_PRESETS.some((p) => p.days === presetDays) ? String(presetDays) : "");
      setItems([]);
      setDraft("");
    }
  }

  const totalDays = days === "custom" ? Number(custom) : days;
  const valid = name.trim().length > 0 && name.trim().length <= 60 && Number.isInteger(totalDays) && totalDays >= 1 && totalDays <= 365;

  function addItem() {
    const value = draft.trim();
    if (!value) return;
    if (!items.some((i) => i.toLowerCase() === value.toLowerCase())) setItems([...items, value]);
    setDraft("");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const created = await createCustomTrackerAction({ name: name.trim(), totalDays });
      if (!created.success || !created.data) {
        toast.error(created.message ?? t("Failed to create challenge"));
        return;
      }
      const all = draft.trim() && !items.includes(draft.trim()) ? [...items, draft.trim()] : items;
      for (const item of all) await addTrackerItemAction(created.data.id, item);
      toast.success(t("Challenge created"));
      onClose();
      router.push(`/habit-tracker/habits/others/${created.data.id}`);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-120 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-xl border border-line bg-surface p-0 shadow-overlay ring-0">
        <form onSubmit={submit} className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
            <AlertDialogTitle className="text-h3 text-ink">{t("New challenge")}</AlertDialogTitle>
            <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-8.5 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>
          <AlertDialogDescription className="px-6 pt-4 text-small text-ink-muted">{t("Day 1 is today. Tick it off each day until you reach the end.")}</AlertDialogDescription>
          <div className="flex flex-col gap-4 px-6 py-4">
            <Field htmlFor="ch-name" label={<span className="text-body font-medium text-ink">{t("Challenge name")}</span>}>
              <Input id="ch-name" size="md" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={60} placeholder={t("No Sugar")} />
            </Field>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-body font-medium text-ink">{t("How many days")}</legend>
              <div role="radiogroup" className="grid grid-cols-5 gap-2">
                {CHALLENGE_PRESETS.map((p) => (
                  <button key={p.days} type="button" role="radio" aria-checked={days === p.days} onClick={() => setDays(p.days)} className={cn("flex h-11 items-center justify-center rounded-md border text-body font-bold transition-colors", days === p.days ? "border-[1.5px] border-emerald bg-mint-50 text-emerald" : "border-line bg-surface text-ink-2 hover:border-line-strong")}>
                    {p.days}
                  </button>
                ))}
                <button type="button" role="radio" aria-checked={days === "custom"} onClick={() => setDays("custom")} className={cn("flex h-11 items-center justify-center rounded-md border text-body font-bold transition-colors", days === "custom" ? "border-[1.5px] border-emerald bg-mint-50 text-emerald" : "border-dashed border-line-strong bg-surface text-ink-2 hover:border-emerald")}>
                  +
                </button>
              </div>
              {days === "custom" && <Input size="sm" inputMode="numeric" value={custom} onChange={(event) => setCustom(event.target.value.replace(/\D/g, "").slice(0, 3))} placeholder={t("Any number of days, up to 365")} aria-label={t("How many days")} />}
            </fieldset>
            <div className="flex flex-col gap-2">
              <span className="text-body font-medium text-ink">
                {t("Daily items")} <span className="font-normal text-ink-muted">({t("optional")})</span>
              </span>
              <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-md border border-line-strong bg-surface px-3 py-1.5 focus-within:border-emerald focus-within:shadow-[0_0_0_0.5px_var(--emerald),0_0_0_4px_var(--mint-50)]">
                {items.map((item) => (
                  <span key={item} className="flex h-7 items-center gap-1.5 rounded-full bg-surface-sunken pr-1.5 pl-3 text-small font-medium text-ink">
                    {item}
                    <button type="button" onClick={() => setItems(items.filter((i) => i !== item))} aria-label={`${t("Remove")} ${item}`} className="flex size-5 items-center justify-center rounded-full text-ink-muted hover:bg-line hover:text-ink">
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </span>
                ))}
                <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => (event.key === "Enter" || event.key === ",") && (event.preventDefault(), addItem())} onBlur={addItem} maxLength={60} aria-label={t("Add a daily item")} placeholder={items.length === 0 ? t("No sweets, No soft drinks… press Enter after each") : ""} className="h-7 min-w-37.5 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-muted" />
              </div>
              <span className="text-caption font-normal text-ink-muted">{t("A day counts as done when every item is ticked. With no items, you tick the day itself.")}</span>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-line bg-cream px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!valid || isPending} className="px-5">
              {isPending && <Loader />}
              {t("Start challenge")}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
