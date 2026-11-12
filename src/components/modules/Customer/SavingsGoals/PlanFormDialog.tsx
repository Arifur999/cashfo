"use client";

import { CircleAlert } from "lucide-react";
import { useState, useTransition } from "react";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Input from "@/components/smartly/form/Input";
import Textarea from "@/components/smartly/form/Textarea";
import type { SavingsPlan, SavingsPlanHorizon, SavingsPlanPriority } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDay } from "@/lib/date";
import { deepBand, freshColor, isGoalColor, shade } from "@/lib/customer/savingsColors";
import { createSavingsPlanAction, type SavingsPlanInput, updateSavingsPlanEntryAction } from "@/lib/customer/savingsGoalActions";
import { savingsError } from "@/lib/customer/savingsDisplay";
import { HORIZONS, PLAN_CATEGORIES, planEmoji, planMonths, planMonthly, planNeedBy, PRIORITIES, PRIORITY_META } from "@/lib/customer/savingsPlans";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { ColorRow } from "./ColorRow";
import { DayButton } from "./DayButton";
import { MoneyField } from "./MoneyField";

interface PlanFormDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  editing: SavingsPlan | null;
  // The colours the plans wear, so a new one starts on a fresh one.
  usedColors: string[];
  currency: string;
  today: string;
  // Saved: the page refreshes and offers Undo.
  onSaved: (saved: SavingsPlan, before: SavingsPlan | null) => void;
}

const LABEL = "text-[13px] font-semibold text-ink-2";
const FRAME = "rounded-[12px] border-[1.5px] border-line";
const choice = (on: boolean) => (on ? "border-emerald bg-emerald-soft text-brand-ink" : "border-line bg-surface text-ink-2 hover:border-input");

// New or edited saving plan (SavingsPlans board's form): what it is for,
// its kind and card colour, about how much, how important, when it is
// needed, a note and a link, and what starting it would take a month. It
// stays a plan: nothing is saved or taken from any account.
export function PlanFormDialog({ open, onClose, businessId, editing, usedColors, currency, today, onSaved }: PlanFormDialogProps) {
  const { t, fmt } = useLocale();
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [amount, setAmount] = useState("");
  const [priority, setPriority] = useState<SavingsPlanPriority>("MEDIUM");
  const [horizon, setHorizon] = useState<SavingsPlanHorizon>("SIX_MONTHS");
  const [needBy, setNeedBy] = useState("");
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "new") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setName(editing?.name ?? "");
      setCategory(editing?.category ?? "");
      setColor(editing && isGoalColor(editing.color) ? editing.color.toLowerCase() : freshColor(usedColors));
      setAmount(editing ? String(Number(editing.amount)) : "");
      setPriority(editing?.priority ?? "MEDIUM");
      setHorizon(editing?.horizon ?? "SIX_MONTHS");
      setNeedBy(editing?.needBy ?? "");
      setNote(editing?.note ?? "");
      setLink(editing?.link ?? "");
      setError("");
    }
  }

  const value = Number(amount) || 0;
  const tomorrow = nextDay(today);
  const months = planMonths(horizon, needBy || null, today);
  const monthly = planMonthly(value, horizon, needBy || null, today);
  const readyBy = planNeedBy(horizon, needBy || null, today);
  const tone = color || "var(--emerald)";
  const emoji = category ? planEmoji(category) : "🎯";
  // A chip writes its name in the box unless the customer typed their own.
  const autoNamed = !name.trim() || PLAN_CATEGORIES.some((item) => item.name && (t(item.name) === name.trim() || item.name === name.trim()));

  const summary = !value
    ? { label: t("Your plan@@savings"), big: t("Add an amount"), side: t("We work out how much to put aside each month.") }
    : horizon === "SOMEDAY"
      ? { label: t("Needed"), big: money(value), side: t("No date yet. You can pick one when you start it as a goal.") }
      : !months || !readyBy
        ? { label: t("Start today and save"), big: money(value), side: t("Pick the date you need it by.") }
        : {
            label: t("Start today and save"),
            big: t("{amount} a month", { amount: money(monthly) }),
            side: t(months === 1 ? "Ready by {date}, {amount} over {count} month." : "Ready by {date}, {amount} over {count} months.", {
              date: formatDay(readyBy, "d MMMM yyyy", fmt),
              amount: money(value),
              count: formatCount(months, fmt),
            }),
          };

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending) return;
    const problem = !name.trim() ? t("Write what you want to save for.") : !value ? t("Enter about how much it costs.") : horizon === "BY_DATE" && !needBy ? t("Pick the date you need it by.") : null;
    if (problem) {
      setError(problem);
      return;
    }
    const input: SavingsPlanInput = {
      name: name.trim(),
      category: category || "others",
      color: color || freshColor(usedColors),
      amount: Math.round(value),
      horizon,
      ...(horizon === "BY_DATE" && { needBy }),
      priority,
      note: note.trim(),
      link: link.trim(),
    };
    startTransition(async () => {
      const result = editing ? await updateSavingsPlanEntryAction(businessId, editing.id, input) : await createSavingsPlanAction(businessId, input);
      if (!result.success || !result.data) {
        setError(savingsError(result.message, "Failed to save the plan", t, currency, fmt));
        return;
      }
      onSaved(result.data, editing);
    });
  }

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      width={600}
      busy={isPending}
      onSubmit={submit}
      className="rounded-[22px] leading-[normal]"
      headClassName="items-center gap-3 px-5.5 py-4"
      titleClassName="text-[18px] font-bold!"
      subClassName="leading-[normal]"
      closeClassName="bg-surface-sunken text-ink-soft hover:bg-line"
      bodyClassName="gap-4 px-5.5 pt-4.5 pb-5"
      footerClassName="px-5.5 py-3.5"
      lead={
        <span aria-hidden="true" className="flex size-10.5 shrink-0 items-center justify-center rounded-[12px] text-[20px]" style={{ background: shade(tone, 0.88) }}>
          {emoji}
        </span>
      }
      title={editing ? t("Edit plan@@savings") : t("New saving plan")}
      sub={t("It stays a plan. Nothing is saved or taken from any account.")}
      footer={
        <>
          <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={isPending} className="px-4.5">
            {t("Cancel")}
          </Button>
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending && <Loader size={16} onDark label={t("Loading...")} />}
            {editing ? t("Save changes") : t("Save plan")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="plan-name" className={LABEL}>
          {t("What do you want to save for?")}
        </label>
        <Input id="plan-name" size="lg" value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={40} placeholder={t("Type your goal")} frameClassName={cn(FRAME, "h-12 px-3.5")} className="text-[15px] font-medium" />
        <div role="radiogroup" aria-label={t("Category")} className="flex flex-wrap justify-between gap-1 sm:flex-nowrap">
          {PLAN_CATEGORIES.map((item) => {
            const on = category === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setCategory(item.key);
                  if (item.name && autoNamed) setName(t(item.name));
                  if (!item.name) document.getElementById("plan-name")?.focus();
                }}
                className={cn("flex h-8 shrink-0 items-center gap-1.25 rounded-full border pr-2.25 pl-2 text-[12px] font-semibold whitespace-nowrap pointer-coarse:h-10", choice(on))}
              >
                <span aria-hidden="true" className="text-[13px]">
                  {item.emoji}
                </span>
                {t(item.label)}
              </button>
            );
          })}
        </div>
      </div>

      <ColorRow value={color} onChange={setColor} />

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor="plan-amount" className={LABEL}>
            {t("About how much?")}
          </label>
          <MoneyField id="plan-amount" value={amount} onChange={setAmount} currency={currency} look="plan" />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <span id="plan-priority-label" className={LABEL}>
            {t("How important?")}
          </span>
          <div role="radiogroup" aria-labelledby="plan-priority-label" className="grid h-13 grid-cols-3 gap-1 rounded-[12px] bg-quiet-chip p-1">
            {PRIORITIES.map((value) => {
              const on = priority === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setPriority(value)}
                  className={cn("flex items-center justify-center gap-1.5 rounded-[9px] text-[13px] font-bold", on ? "bg-surface text-ink shadow-[0_1px_3px_rgb(18_32_29/0.14)] dark:bg-surface-raised" : "text-ink-muted hover:text-ink")}
                >
                  <span aria-hidden="true" className={cn("size-1.75 rounded-full", PRIORITY_META[value].dot)} />
                  {t(PRIORITY_META[value].label)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span id="plan-when-label" className={LABEL}>
          {t("When do you need it?")}
        </span>
        <div role="radiogroup" aria-labelledby="plan-when-label" className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {HORIZONS.map((item) => {
            const on = horizon === item.value;
            return (
              <button key={item.value} type="button" role="radio" aria-checked={on} onClick={() => setHorizon(item.value)} className={cn("h-10 rounded-[11px] border-[1.5px] px-1 text-[12.5px] font-semibold whitespace-nowrap", choice(on))}>
                {t(item.label)}
              </button>
            );
          })}
        </div>
        {horizon === "BY_DATE" && <DayButton value={needBy} onChange={setNeedBy} today={today} min={tomorrow} labelledBy="plan-when-label" placeholder={t("Pick a date")} />}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor="plan-note" className={LABEL}>
            {t("Note")} <span className="font-normal text-ink-muted">({t("optional")})</span>
          </label>
          <Textarea id="plan-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder={t("e.g. The model, the shop, who it is for")} className={cn(FRAME, "min-h-12 resize-y px-3.5 py-3 text-[14px] leading-[1.45]")} />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor="plan-link" className={LABEL}>
            {t("Link")} <span className="font-normal text-ink-muted">({t("optional")})</span>
          </label>
          <Input id="plan-link" type="url" value={link} onChange={(event) => setLink(event.target.value)} maxLength={500} placeholder={t("e.g. a product page")} frameClassName={cn(FRAME, "h-13 px-3.5")} className="text-[14px]" />
        </div>
      </div>

      <div aria-live="polite" className="relative flex items-center gap-3.5 overflow-hidden rounded-[16px] px-4.5 py-4 text-white" style={{ background: deepBand(tone) }}>
        <span aria-hidden="true" className="pointer-events-none absolute -top-20 -right-12.5 size-50 rounded-full bg-[radial-gradient(circle,rgb(255_255_255/0.16)_0,transparent_68%)]" />
        <span className="relative flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[11px] font-bold tracking-[0.08em] text-white/72 uppercase">{summary.label}</span>
          <span className="text-[24px] leading-[normal] font-bold tracking-[-0.02em] tabular-nums">{summary.big}</span>
        </span>
        <span className="relative max-w-60 text-right text-[12.5px] leading-[1.45] text-white/85">{summary.side}</span>
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-2 text-[13px] text-expense">
          <CircleAlert className="size-3.75 shrink-0" strokeWidth={2.25} aria-hidden="true" />
          {error}
        </p>
      )}
    </PopupDialog>
  );
}

function nextDay(iso: string): string {
  const date = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + 1));
  return date.toISOString().slice(0, 10);
}
