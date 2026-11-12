"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import type { SavingsWalletGoals, SavingsWalletHistoryRow } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { getSavingsWalletHistoryAction } from "@/lib/customer/savingsGoalActions";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";

export interface WalletView {
  id: string;
  name: string;
  accountNumber: string | null;
  balance: string;
}

interface WalletGoalsDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  wallet: WalletView | null;
  goals: SavingsWalletGoals["goals"];
  // Each goal's colour, as on the goals page.
  colorOf: (goalId: string) => string;
  currency: string;
}

type Tab = "goal" | "history";

// A savings account's details (design: SavingsWallets' Wallet details): By
// goal -- which goals its money belongs to, how much and how it got there
// -- and History, every goal movement in it.
export function WalletGoalsDialog({ open, onClose, businessId, wallet, goals, colorOf, currency }: WalletGoalsDialogProps) {
  const { t, fmt } = useLocale();
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const [tab, setTab] = useState<Tab>("goal");
  const [history, setHistory] = useState<{ id: string; rows: SavingsWalletHistoryRow[] | null } | null>(null);

  const [prevKey, setPrevKey] = useState<string | null>(null);
  const key = open && wallet ? wallet.id : null;
  if (key !== prevKey) {
    setPrevKey(key);
    setTab("goal");
  }

  const walletId = open && wallet && tab === "history" ? wallet.id : null;
  useEffect(() => {
    if (!walletId) return;
    let cancelled = false;
    getSavingsWalletHistoryAction(businessId, walletId)
      .then((result) => !cancelled && setHistory({ id: walletId, rows: result.success ? (result.data ?? []) : null }))
      .catch(() => !cancelled && setHistory({ id: walletId, rows: null }));
    return () => {
      cancelled = true;
    };
  }, [walletId, businessId]);

  if (!wallet) return null;
  const total = goals.reduce((sum, goal) => sum + Number(goal.amount), 0);
  const rows = history?.id === wallet.id ? history.rows : undefined;
  const historyLine = (row: SavingsWalletHistoryRow) => {
    switch (row.kind) {
      case "ALREADY_SAVED":
        return { title: t("Already saved for {goal}", { goal: row.goalName }), sub: t("Recorded when the goal was made"), tone: "text-income", sign: "+ " };
      case "ADDED":
        return { title: t("Added for {goal}", { goal: row.goalName }), sub: row.accountName ? t("From {account}", { account: row.accountName }) : "", tone: "text-income", sign: "+ " };
      case "PROFIT":
        return { title: t("Profit for {goal}", { goal: row.goalName }), sub: row.accountName ? t("Counted as income · {name}", { name: t(row.accountName) }) : "", tone: "text-income", sign: "+ " };
      case "MOVED":
        return { title: t("Moved from {from} to {to}", { from: row.goalName, to: row.otherGoalName ?? "" }), sub: t("Goal transfer · balance unchanged"), tone: "text-info", sign: "" };
      case "ACCOUNT_IN":
        return { title: t("{goal} moved here", { goal: row.goalName }), sub: row.accountName ? t("From {account}", { account: row.accountName }) : "", tone: "text-income", sign: "+ " };
      case "ACCOUNT_OUT":
        return { title: t("{goal} moved away", { goal: row.goalName }), sub: row.accountName ? t("To {account}", { account: row.accountName }) : "", tone: "text-expense", sign: "− " };
      default:
        return { title: t("Withdrawn from {goal}", { goal: row.goalName }), sub: row.accountName ? t("To {account}", { account: row.accountName }) : "", tone: "text-expense", sign: "− " };
    }
  };

  return (
    <PopupDialog
      className="leading-[normal]"
      open={open}
      onClose={onClose}
      width={620}
      title={wallet.name}
      sub={
        <span className="tabular-nums">
          {wallet.accountNumber && `${wallet.accountNumber} · `}
          {fillNodes(t("balance {amount}"), { amount: <b className="text-ink">{money(wallet.balance)}</b> })}
        </span>
      }
      headClassName="items-center gap-3.5 border-b-0 pt-4.5 pb-3 [&>div]:gap-0.5"
      titleClassName="leading-[normal]!"
      subClassName="leading-[normal]"
      bodyClassName="gap-0 px-0 py-0"
      footerClassName="justify-between"
      footer={
        <>
          <Link href="/savings-goals/dashboard" onNavigate={onClose} className="inline-flex min-h-10 items-center text-[13.5px] font-semibold text-emerald hover:text-emerald-hover">
            {t("Go to goals")}
          </Link>
          <Button size="lg" onClick={onClose}>
            {t("Done")}
          </Button>
        </>
      }
    >
      <div role="tablist" aria-label={t("Account details")} className="flex shrink-0 gap-5 border-b border-line px-6">
        {(
          [
            ["goal", t("By goal")],
            ["history", t("History")],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn("h-10 border-b-2 px-0.5 text-body", tab === value ? "border-emerald font-semibold text-emerald" : "border-transparent font-medium text-ink-muted hover:text-ink")}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "goal" ? (
        <div className="flex flex-col px-6 pt-2 pb-3">
          {goals.length === 0 ? (
            <p className="py-7 text-center text-[13.5px] text-ink-muted">{t("No goal money in this account yet. When you add money to a goal and keep it here, it shows up in this list.")}</p>
          ) : (
            <>
              <div role="img" aria-label={goals.map((goal) => `${goal.goalName} ${Math.round((Number(goal.amount) / total) * 100)}%`).join(", ")} className="mt-2.5 mb-1.5 flex h-3 gap-0.75 overflow-hidden rounded-full bg-line">
                {goals.map((goal) => (
                  <span key={goal.goalId} style={{ width: `${(Number(goal.amount) / total) * 100}%`, background: colorOf(goal.goalId) }} />
                ))}
              </div>
              {goals.map((goal) => {
                const sub = [goal.deposits ? t(goal.deposits === 1 ? "{count} deposit" : "{count} deposits", { count: formatCount(goal.deposits, fmt) }) : "", goal.movedInFrom.length ? t("moved in from {names}", { names: goal.movedInFrom.join(", ") }) : ""].filter(Boolean).join(" · ");
                return (
                  <Link
                    key={goal.goalId}
                    href={`/savings-goals/dashboard?goal=${goal.goalId}`}
                    onNavigate={onClose}
                    className="grid min-h-14 grid-cols-[minmax(0,1fr)_120px_56px] items-center gap-x-3.5 border-b border-divider text-ink hover:bg-hover"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(goal.goalId) }} />
                      <span className="flex min-w-0 flex-col gap-px">
                        <span className="truncate text-body font-semibold">{goal.goalName}</span>
                        {sub && <span className="truncate text-caption text-ink-muted">{sub.charAt(0).toUpperCase() + sub.slice(1)}</span>}
                      </span>
                    </span>
                    <span className="text-right text-body font-bold tabular-nums">{money(goal.amount)}</span>
                    <span className="text-right text-[13px] text-ink-muted tabular-nums">{formatCount(Math.round((Number(goal.amount) / total) * 100), fmt)}%</span>
                  </Link>
                );
              })}
              <p className="mt-2.5 text-[12.5px] leading-normal text-ink-muted">{t("Click a goal to open it. Moving money between goals changes these numbers but not the account balance.")}</p>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col px-6 pt-2 pb-1">
          {rows === undefined ? (
            <div className="flex justify-center py-8">
              <Loader size={20} label={t("Loading...")} />
            </div>
          ) : rows === null ? (
            <p role="alert" className="py-6 text-center text-small text-ink-muted">
              {t("Couldn't load this account's history.")}
            </p>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-ink-muted">{t("No entries yet. Money you add to a goal shows up here.")}</p>
          ) : (
            rows.map((row) => {
              const line = historyLine(row);
              return (
                <div key={row.id} className="grid min-h-14 grid-cols-[96px_minmax(0,1fr)_120px] items-center gap-x-3.5 border-b border-divider text-body">
                  <span className="text-[13px] text-ink-soft">{formatDate(row.date, "d MMM yyyy", fmt)}</span>
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className="truncate font-medium">{line.title}</span>
                    <span className="truncate text-caption text-ink-muted">{[line.sub, row.notes].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className={cn("text-right font-semibold tabular-nums", line.tone)}>
                    {line.sign}
                    {money(row.amount)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </PopupDialog>
  );
}
