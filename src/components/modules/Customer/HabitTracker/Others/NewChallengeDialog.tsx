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
import { CHALLENGE_PRESETS, DAY_ITEM } from "@/lib/customer/challengeDisplay";
import { actionError, latinDigits } from "@/lib/customer/habitDisplay";
import { createChallengeAction } from "@/lib/customer/habitsActions";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CloseButton, PanelFooter } from "../Tracker/PanelParts";

interface NewChallengeDialogProps {
  open: boolean;
  onClose: () => void;
  // The length picked on the page, if any.
  presetDays: number | null;
}

const MAX_DAYS = 365;
// The server's longest daily item name.
const MAX_ITEM = 40;

// A new challenge: a name, how many days, and the daily items to tick
// (one is enough; none means the day itself is ticked).
export function NewChallengeDialog({ open, onClose, presetDays }: NewChallengeDialogProps) {
  const { t, locale } = useLocale();
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
  const daysOk = Number.isInteger(totalDays) && totalDays >= 1 && totalDays <= MAX_DAYS;
  const valid = name.trim().length > 0 && name.trim().length <= 60 && daysOk;
  // Why Start stays off for a length of its own.
  const daysError = days === "custom" && custom !== "" && !daysOk ? t("From 1 to {max} days.", { max: formatCount(MAX_DAYS, locale) }) : undefined;
  // The hidden item the day itself is ticked through can't be one of yours.
  const usable = (value: string) => value !== DAY_ITEM;

  function addItem() {
    const value = draft.trim();
    if (!value) return;
    if (usable(value) && !items.some((i) => i.toLowerCase() === value.toLowerCase())) setItems([...items, value]);
    setDraft("");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const last = draft.trim();
      const all = last && usable(last) && !items.some((i) => i.toLowerCase() === last.toLowerCase()) ? [...items, last] : items;
      const result = await createChallengeAction({ name: name.trim(), totalDays, items: all });
      if (!result.data) {
        toast.error(actionError(result.message, "Failed to create challenge", t, locale));
        return;
      }
      // Made, even if an item was refused: open it, and say what went wrong.
      if (result.success) toast.success(t("Challenge created"));
      else toast.error(actionError(result.message, "Failed to save habit", t, locale));
      onClose();
      router.push(`/habit-tracker/habits/others/${result.data.id}`);
    });
  }

  const pick = (on: boolean) => cn("flex h-11 items-center justify-center rounded-md border text-body font-bold transition-colors", on ? "border-[1.5px] border-emerald bg-mint-50 text-brand-ink" : "border-line bg-surface text-ink-2 hover:border-line-strong");

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-120 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-xl border border-line bg-surface p-0 shadow-overlay ring-0">
        <form onSubmit={submit} className="flex max-h-[calc(100dvh-32px)] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
            <AlertDialogTitle className="text-h3 text-ink">{t("New challenge")}</AlertDialogTitle>
            <CloseButton onClick={onClose} label={t("Close")} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <AlertDialogDescription className="px-6 pt-4 text-small text-ink-muted">{t("Day 1 is today. Tick it off each day until you reach the end.")}</AlertDialogDescription>
            <div className="flex flex-col gap-4 px-6 py-4">
              <Field htmlFor="ch-name" label={<span className="text-body font-medium text-ink">{t("Challenge name")}</span>}>
                <Input id="ch-name" size="md" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={60} placeholder={t("No Sugar")} />
              </Field>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-body leading-[normal] font-medium text-ink">{t("How many days")}</legend>
                <div role="radiogroup" aria-label={t("How many days")} className="grid grid-cols-5 gap-2">
                  {CHALLENGE_PRESETS.map((p) => (
                    <button key={p.days} type="button" role="radio" aria-checked={days === p.days} onClick={() => setDays(p.days)} className={pick(days === p.days)}>
                      {formatCount(p.days, locale)}
                    </button>
                  ))}
                  <button type="button" role="radio" aria-checked={days === "custom"} aria-label={t("Your own length")} onClick={() => setDays("custom")} className={cn(pick(days === "custom"), days !== "custom" && "border-dashed border-line-strong hover:border-emerald")}>
                    +
                  </button>
                </div>
                {days === "custom" && (
                  <Field htmlFor="ch-days" label={<span className="sr-only">{t("How many days")}</span>} hint={custom === "" ? t("Enter how many days.") : undefined} error={daysError}>
                    <Input id="ch-days" size="sm" inputMode="numeric" value={custom} onChange={(event) => setCustom(latinDigits(event.target.value).replace(/\D/g, "").slice(0, 3))} invalid={daysError !== undefined} placeholder={t("Any number of days, up to 365")} />
                  </Field>
                )}
              </fieldset>
              <div className="flex flex-col gap-2">
                <span className="text-body font-medium text-ink">
                  {t("Daily items")} <span className="font-normal text-ink-muted">({t("optional")})</span>
                </span>
                <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-md border border-line-strong bg-surface px-3 py-1.5 focus-within:border-emerald focus-within:shadow-[0_0_0_0.5px_var(--emerald),0_0_0_4px_var(--mint-50)]">
                  {items.map((item) => (
                    <span key={item} className="flex h-7 max-w-full items-center gap-1.5 rounded-full bg-surface-sunken pr-1.5 pl-3 text-small font-medium text-ink">
                      <span className="truncate">{item}</span>
                      <button type="button" onClick={() => setItems(items.filter((i) => i !== item))} aria-label={t("Remove {name} from the list", { name: item })} className="relative flex size-5 shrink-0 items-center justify-center rounded-full text-ink-muted after:absolute after:-inset-2 hover:bg-surface hover:text-ink">
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                  <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => (event.key === "Enter" || event.key === ",") && (event.preventDefault(), addItem())} onBlur={addItem} maxLength={MAX_ITEM} aria-label={t("Add a daily item")} placeholder={items.length === 0 ? t("No sweets, No soft drinks… press Enter after each") : ""} className="h-7 min-w-37.5 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-muted" />
                </div>
                <span className="text-caption font-normal text-ink-muted">{t("A day counts as done when every item is ticked. With no items, you tick the day itself.")}</span>
              </div>
            </div>
          </div>
          <PanelFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!valid || isPending} className="px-5">
              {isPending && <Loader />}
              {t("Start challenge")}
            </Button>
          </PanelFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
