"use client";

import { ArrowLeftRight, ArrowRight, ArrowUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import EmptyState from "@/components/smartly/EmptyState";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { SavingsGoal, SavingsTransferRow } from "@/lib/customer/api";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { normalizeMoneyInput } from "@/lib/customer/money";
import { createSavingsTransferAction } from "@/lib/customer/savingsGoalActions";
import { getAppToday } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GoalPicker } from "./GoalPicker";

interface SavingsTransferPageClientProps {
  businessId: string;
  goals: SavingsGoal[];
  transfers: SavingsTransferRow[];
  currency: string;
  canManage: boolean;
}

const GRID = "md:grid-cols-[100px_minmax(0,1fr)_120px]";

// Move between goals: the history of every move, and the form to make the
// next one beside it. Only which goal the money counts toward changes.
export function SavingsTransferPageClient({ businessId, goals, transfers, currency, canManage }: SavingsTransferPageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [isPending, startTransition] = useTransition();

  // A withdrawn goal was paid out and is closed: it can't take money and
  // has none to give.
  const open = goals.filter((goal) => goal.status !== "WITHDRAWN");
  const from = open.find((goal) => goal.id === fromId);
  const to = open.find((goal) => goal.id === toId);
  const value = Number(amount) || 0;
  const valid = !!from && !!to && from.id !== to.id && value > 0 && value <= Number(from.currentAmount);
  const total = transfers.reduce((sum, transfer) => sum + Number(transfer.amount), 0);
  const toAfter = to ? Math.min(100, Math.round(((Number(to.currentAmount) + value) / Number(to.targetAmount)) * 100)) : 0;

  function swap() {
    setFromId(toId);
    setToId(fromId);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const result = await createSavingsTransferAction(businessId, { fromGoalId: fromId, toGoalId: toId, amount: value, date: getAppToday() });
      if (result.success) {
        toast.success(t("Moved"));
        setAmount("");
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to move"));
      }
    });
  }

  return (
    <PageFrame className="gap-6">
      <PageHeader eyebrow={`${t("Money")} · ${t("Savings")}`} title={t("Move between goals")} description={t("Shift saved money from one goal to another. Only which goal it counts toward changes.")} />

      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_380px]">
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5">
            <h2 className="text-title text-ink">{t("History")}</h2>
            <span className="text-small text-ink-muted tabular-nums">
              {transfers.length} {t(transfers.length === 1 ? "move" : "moves")} · {formatCurrency(total, currency)}
            </span>
          </div>
          {transfers.length === 0 ? (
            <EmptyState bordered={false} tone="info" icon={<ArrowLeftRight />} title={t("Nothing moved yet")} description={t("Shift money from one goal to another and it shows up here.")} className="border-t border-line" />
          ) : (
            <>
              <div className={cn("hidden items-center gap-x-4 border-y border-line bg-cream px-6 py-3 text-caption text-ink-muted md:grid", GRID)}>
                <span>{t("Date")}</span>
                <span>{t("From → To")}</span>
                <span className="text-right">{t("Amount")}</span>
              </div>
              {transfers.map((transfer) => (
                <div key={transfer.id} className={cn("grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-surface-sunken px-4 py-3 text-body md:px-6", GRID)}>
                  <span className="order-3 text-caption text-ink-2 md:order-0 md:text-body">{formatDate(transfer.date)}</span>
                  <span className="flex min-w-0 flex-col gap-0.75">
                    <span className="flex items-center gap-2 font-medium text-ink">
                      <span className="truncate">{transfer.fromGoalName}</span>
                      <ArrowRight className="size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
                      <span className="truncate">{transfer.toGoalName}</span>
                    </span>
                    {transfer.notes && <span className="truncate text-caption font-normal text-ink-muted">{transfer.notes}</span>}
                  </span>
                  <span className="row-start-1 text-right font-semibold text-info tabular-nums md:row-start-auto">{formatCurrency(transfer.amount, currency)}</span>
                </div>
              ))}
            </>
          )}
        </Card>

        {canManage && (
          <Card asChild className="flex flex-col gap-4">
            <form onSubmit={submit}>
              <h2 className="text-title text-ink">{t("New move")}</h2>
              {open.length < 2 && <p className="text-small text-ink-muted">{t("You need at least two goals to move money between them.")}</p>}
              <div className="flex flex-col gap-2">
                <label htmlFor="st-from" className="text-small font-medium text-ink-2">
                  {t("From goal")}
                </label>
                <GoalPicker id="st-from" goals={goals} options={open.filter((goal) => Number(goal.currentAmount) > 0)} value={fromId} onChange={setFromId} currency={currency} disabled={open.length < 2} />
              </div>
              <div className="-my-3.5 flex justify-center">
                <button type="button" onClick={swap} aria-label={t("Swap From and To")} title={t("Swap")} className="relative z-10 flex size-8 items-center justify-center rounded-full border border-line-strong bg-surface text-ink-2 shadow-[0_2px_6px_rgba(14,26,22,0.08)] hover:bg-cream">
                  <ArrowUpDown className="size-3.5" aria-hidden="true" />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="st-to" className="text-small font-medium text-ink-2">
                  {t("To goal")}
                </label>
                <GoalPicker id="st-to" goals={goals} options={open.filter((goal) => goal.id !== fromId)} value={toId} onChange={setToId} currency={currency} disabled={open.length < 2} />
              </div>
              <Field
                htmlFor="st-amount"
                label={<span className="text-small font-medium text-ink-2">{t("Amount")}</span>}
                hint={from && to && value > 0 ? `${to.name} ${t("goes to")} ${toAfter}% · ${from.name} ${t("keeps")} ${formatCurrency(Math.max(0, Number(from.currentAmount) - value), currency)}` : from ? `${t("Up to")} ${formatCurrency(from.currentAmount, currency)} ${t("in")} ${from.name}` : undefined}
              >
                <Input
                  id="st-amount"
                  type="text"
                  inputMode="decimal"
                  size="lg"
                  value={amount}
                  onChange={(event) => setAmount(normalizeMoneyInput(event.target.value))}
                  placeholder="0"
                  disabled={open.length < 2}
                  invalid={!!from && value > Number(from.currentAmount)}
                  leading={<span className="flex h-12 w-11 items-center justify-center border-r border-line bg-cream text-h3 font-semibold text-ink-2">{currencySymbol(currency)}</span>}
                  frameClassName="gap-0 overflow-hidden pl-0"
                  className="pl-3 text-h3 font-bold tabular-nums"
                />
              </Field>
              <Button type="submit" variant="action" size="lg" disabled={!valid || isPending} className="h-10.5 w-full">
                {isPending && <Loader size={16} onDark label={t("Loading...")} />}
                {t("Move")} {value > 0 && formatCurrency(value, currency)}
              </Button>
            </form>
          </Card>
        )}
      </div>
    </PageFrame>
  );
}
