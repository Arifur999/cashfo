"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import AmountInput from "@/components/modules/Customer/Shared/AmountInput";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import type { SavingsGoal } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { createSavingsTransferAction } from "@/lib/customer/savingsGoalActions";
import { savingsError } from "@/lib/customer/savingsDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { SavingsDialog } from "./SavingsDialog";

export interface MoveSetup {
  // The goal the money leaves, and whether it can be picked here.
  fromId: string;
  pickFrom: boolean;
  // The goal it goes to, when already known (Catch up's "move money in").
  toId?: string;
}

interface MoveMoneyDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  goals: SavingsGoal[];
  setup: MoveSetup | null;
  currency: string;
  today: string;
  onReached: (goalId: string) => void;
}

const pct = (goal: SavingsGoal, add = 0) => (Number(goal.targetAmount) > 0 ? Math.min(100, Math.round(((Number(goal.currentAmount) + add) / Number(goal.targetAmount)) * 100)) : 0);

// Move saved money from one goal to another (design: SavingsDashboard's
// Move money popup). The money stays in the same savings account; only the
// goal it counts toward changes. Every move is listed on All moves.
export function MoveMoneyDialog({ open, onClose, businessId, goals, setup, currency, today, onReached }: MoveMoneyDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open && setup ? `${setup.fromId}|${setup.toId ?? ""}` : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open && setup) {
      const from = goals.find((goal) => goal.id === setup.fromId);
      setFromId(setup.fromId);
      setToId(setup.toId ?? "");
      setAmount(from ? String(Number(from.currentAmount)) : "");
      setError("");
    }
  }

  const from = goals.find((goal) => goal.id === fromId);
  if (!setup || !from) return null;
  const to = goals.find((goal) => goal.id === toId);
  const value = Number(amount) || 0;
  const saved = Number(from.currentAmount);
  const room = to ? Math.max(0, Number(to.targetAmount) - Number(to.currentAmount)) : 0;
  const fromOptions = goals.filter((goal) => Number(goal.currentAmount) > 0 && goal.status !== "WITHDRAWN" && goal.id !== toId);
  const toOptions = goals.filter((goal) => goal.id !== from.id && goal.status !== "WITHDRAWN" && goal.status !== "COMPLETED");
  const chips = [{ label: t("All · {amount}", { amount: money(saved) }), amount: saved }];
  if (to && room > 0 && room < saved) chips.push({ label: t("Fill {name} · {amount}", { name: to.name, amount: money(room) }), amount: room });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending || !from) return;
    if (!to) return setError(t("Pick the goal to move the money to."));
    if (!value) return setError(t("Enter an amount."));
    if (value > saved) return setError(t("{name} has only {amount}.", { name: from.name, amount: money(saved) }));
    if (value > room) return setError(t("{name} needs only {amount} to reach its target.", { name: to.name, amount: money(room) }));
    const reached = Number(to.currentAmount) + value >= Number(to.targetAmount);
    startTransition(async () => {
      const result = await createSavingsTransferAction(businessId, { fromGoalId: from.id, toGoalId: to.id, amount: value, date: today });
      if (!result.success) {
        setError(savingsError(result.message, "Failed to move", t, currency, fmt));
        return;
      }
      toast.success(t("{amount} moved from {from} to {to}. It stays in the same savings account.", { amount: money(value), from: from.name, to: to.name }));
      onClose();
      if (reached) onReached(to.id);
      router.refresh();
    });
  }

  return (
    <SavingsDialog
      open={open}
      onClose={onClose}
      width={520}
      busy={isPending}
      onSubmit={submit}
      title={setup.pickFrom ? t("Move money between goals") : t("Move money from {name}", { name: from.name })}
      sub={t("The money stays in the same savings account. Only the goal it counts toward changes.")}
      footerClassName="justify-between"
      footer={
        <>
          <Link href="/savings-goals/transfer" onNavigate={onClose} className="inline-flex min-h-10 items-center text-small font-semibold text-emerald hover:text-emerald-hover">
            {t("See all moves")}
          </Link>
          <span className="flex gap-2.5">
            <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" size="lg" disabled={isPending}>
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {value > 0 ? t("Move {amount}", { amount: money(value) }) : t("Move money")}
            </Button>
          </span>
        </>
      }
    >
      {setup.pickFrom && (
        <Field htmlFor="mv-from" label={<span className="text-body font-medium text-ink">{t("Take it from")}</span>}>
          <NativeSelect
            id="mv-from"
            size="md"
            value={from.id}
            onChange={(event) => {
              const next = goals.find((goal) => goal.id === event.target.value);
              if (!next) return;
              setFromId(next.id);
              setAmount(String(Number(next.currentAmount)));
              if (toId === next.id) setToId("");
              setError("");
            }}
          >
            {fromOptions.map((goal) => (
              <option key={goal.id} value={goal.id}>{`${goal.name} · ${t("{amount} saved", { amount: money(goal.currentAmount) })}`}</option>
            ))}
          </NativeSelect>
        </Field>
      )}
      <Field htmlFor="mv-to" label={<span className="text-body font-medium text-ink">{t("Move it to")}</span>}>
        <NativeSelect id="mv-to" size="md" value={toId} onChange={(event) => setToId(event.target.value)}>
          <option value="" disabled>
            {toOptions.length ? t("Pick a goal") : t("No goal to pick")}
          </option>
          {toOptions.map((goal) => (
            <option key={goal.id} value={goal.id}>{`${goal.name} · ${formatCount(pct(goal), fmt)}% · ${t("{amount} to go", { amount: money(Math.max(0, Number(goal.targetAmount) - Number(goal.currentAmount))) })}`}</option>
          ))}
        </NativeSelect>
      </Field>
      <div className="flex flex-col gap-2">
        <label htmlFor="mv-amount" className="text-body font-medium text-ink">
          {t("Amount")}
        </label>
        <AmountInput id="mv-amount" value={amount} onChange={setAmount} currency={currency} />
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <button key={chip.label} type="button" onClick={() => setAmount(String(chip.amount))} className="h-8 rounded-full border border-line bg-surface px-3 text-caption font-semibold text-ink-2 tabular-nums hover:border-line-strong pointer-coarse:h-11">
              {chip.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-strip px-4 py-3.5 text-small tabular-nums">
        <span className="text-caption font-semibold tracking-[0.04em] text-ink-muted uppercase">{t("After this")}</span>
        <div className="flex justify-between gap-3">
          <span className="min-w-0 truncate text-ink-2">{from.name}</span>
          <span className="shrink-0">
            <span className="text-ink-muted">{money(saved)} → </span>
            <span className="font-semibold text-ink">{money(Math.max(0, saved - value))}</span>
          </span>
        </div>
        {to && (
          <div className="flex justify-between gap-3">
            <span className="min-w-0 truncate text-ink-2">{to.name}</span>
            <span className="shrink-0">
              <span className="text-ink-muted">{money(to.currentAmount)} → </span>
              <span className="font-semibold text-emerald">
                {money(Number(to.currentAmount) + value)} · {formatCount(pct(to, value), fmt)}%
              </span>
            </span>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="text-small text-expense">
          {error}
        </p>
      )}
    </SavingsDialog>
  );
}
