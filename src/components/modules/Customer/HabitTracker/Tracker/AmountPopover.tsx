"use client";

import { useId, useState } from "react";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { amountLabel, MAX_AMOUNT, parseAmount, quickAmounts, unitLabel } from "@/lib/customer/habitDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface AmountPopoverProps {
  // The habit's name, for the field's label.
  name: string;
  // The day's amount so far, its goal and unit.
  value: number;
  target: number;
  unit: string | null;
  disabled?: boolean;
  onSave: (value: number) => void;
  // What the trigger shows: the "3 / 8" figure.
  children: React.ReactNode;
  triggerClassName?: string;
}

// A counted habit's amount, typed in one go: a 30-minute walk or 10,000
// steps is one entry, not thirty taps. The figure opens a small field (it
// takes Bangla digits too) with a quick "+5" or "+10" and "Reached goal".
export function AmountPopover({ name, value, target, unit, disabled = false, onSave, children, triggerClassName }: AmountPopoverProps) {
  const { t, fmt } = useLocale();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const typed = parseAmount(text);
  const id = useId();

  function openChange(next: boolean) {
    if (next) setText(String(value));
    setOpen(next);
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (typed === null) return;
    setOpen(false);
    if (typed !== value) onSave(typed);
  }

  const chip = "h-8 rounded-full border px-3 text-caption font-semibold transition-colors pointer-coarse:h-11";

  return (
    <Popover open={open} onOpenChange={openChange}>
      <PopoverTrigger asChild>
        <button type="button" disabled={disabled} aria-label={t("Change the amount for {name}: {amount}", { name, amount: t("{value} of {amount}", { value: formatCount(value, fmt), amount: amountLabel(target, unit, t, fmt) }) })} className={cn("rounded-md tabular-nums underline decoration-line-strong decoration-dotted underline-offset-4 transition-colors hover:bg-surface-sunken disabled:no-underline disabled:opacity-60", triggerClassName)}>
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} aria-label={t("Amount for {name}", { name })} className="w-72 gap-0 rounded-lg border border-line bg-surface p-0 text-ink shadow-overlay ring-0">
        <form onSubmit={save} className="flex flex-col gap-3 p-4">
          <Field htmlFor={id} label={<span className="text-body font-medium text-ink">{t("Amount for {name}", { name })}</span>} hint={t("Goal: {amount}", { amount: amountLabel(target, unit, t, fmt) })} error={text.trim() !== "" && typed === null ? t("Enter a whole number up to {max}.", { max: formatCount(MAX_AMOUNT, fmt) }) : undefined}>
            <Input
              id={id}
              size="md"
              inputMode="numeric"
              autoFocus
              value={text}
              onChange={(event) => setText(event.target.value.replace(/[^\d০-৯]/g, "").slice(0, 6))}
              invalid={text.trim() !== "" && typed === null}
              trailing={unit ? <span className="pr-3 text-small text-ink-muted">{unitLabel(unit, t)}</span> : undefined}
              className="text-body-lg font-semibold"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            {quickAmounts(target).map((amount) => (
              <button key={amount} type="button" onClick={() => setText(String(Math.min(MAX_AMOUNT, (typed ?? value) + amount)))} className={cn(chip, "border-line bg-surface text-ink-2 hover:border-line-strong")}>
                {t("+{count}", { count: formatCount(amount, fmt) })}
              </button>
            ))}
            <button type="button" onClick={() => setText(String(target))} className={cn(chip, "border-emerald bg-mint-50 text-brand-ink hover:bg-mint-200 dark:hover:bg-emerald/20")}>
              {t("Reached goal")}
            </button>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={typed === null}>
              {t("Save")}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
