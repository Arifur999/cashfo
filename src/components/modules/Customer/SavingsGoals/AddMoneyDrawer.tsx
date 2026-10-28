"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/modules/Customer/Books/shared/Drawer";
import AmountInput from "@/components/modules/Customer/Shared/AmountInput";
import { WalletPicker } from "@/components/modules/Customer/Shared/WalletPicker";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Account, SavingsGoal } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { listMoneyAccountsAction } from "@/lib/customer/quickEntryActions";
import { addContributionAction, listActiveSavingsWalletsAction } from "@/lib/customer/savingsGoalActions";
import { goalBadge, goalColor, quickAmounts, savingsError } from "@/lib/customer/savingsDisplay";
import { getAppToday } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GoalRing } from "./GoalRing";

interface AddMoneyDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  goal: SavingsGoal | null;
  // The goal's place in the list, which picks its ring colour.
  goalIndex: number;
  currency: string;
}

// What the two wallet lists came back as. A failed one is told apart from
// an empty one, so an outage never reads "No savings wallet yet".
interface WalletLoad {
  money: Account[];
  moneyError: string | null;
  savings: Account[];
  savingsError: string | null;
}

// Add money to a goal: how much (with the monthly target and what is left
// as quick picks), which wallet it leaves, which savings wallet it sits in,
// and where everything stands after.
export function AddMoneyDrawer({ open, onClose, businessId, goal, goalIndex, currency }: AddMoneyDrawerProps) {
  const { t, locale, fmt } = useLocale();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [fromId, setFromId] = useState("");
  const [intoId, setIntoId] = useState("");
  const [date, setDate] = useState(getAppToday());
  const [note, setNote] = useState("");
  const [load, setLoad] = useState<WalletLoad | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setAmount("");
      setNote("");
      setDate(getAppToday());
      setLoad(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    // A reply that lands after the drawer closed (or a retry started) is
    // dropped; one that never comes (offline) ends as a failure, not an
    // endless spinner.
    let cancelled = false;
    Promise.all([listMoneyAccountsAction(businessId), listActiveSavingsWalletsAction(businessId)])
      .then(([money, savings]) => {
        if (cancelled) return;
        const moneyList = money.data ?? [];
        const savingsList = savings.data ?? [];
        setLoad({
          money: moneyList,
          moneyError: money.success ? null : (money.message ?? "Couldn't load your wallets."),
          savings: savingsList,
          savingsError: savings.success ? null : (savings.message ?? "Couldn't load your savings wallets."),
        });
        // The last choice stays while its wallet is still on offer.
        setFromId((current) => (moneyList.some((wallet) => wallet.id === current) ? current : (moneyList[0]?.id ?? "")));
        setIntoId((current) => (savingsList.some((wallet) => wallet.id === current) ? current : (savingsList[0]?.id ?? "")));
      })
      .catch(() => {
        if (!cancelled) setLoad({ money: [], moneyError: "Couldn't load your wallets.", savings: [], savingsError: "Couldn't load your savings wallets." });
      });
    return () => {
      cancelled = true;
    };
  }, [open, businessId, attempt]);

  const loading = load === null;
  const wallets = load?.money ?? [];
  const savingsWallets = load?.savings ?? [];
  const loadFailed = !!load && (load.moneyError !== null || load.savingsError !== null);
  const value = Number(amount) || 0;
  const from = wallets.find((w) => w.id === fromId);
  const into = savingsWallets.find((w) => w.id === intoId);
  const valid = !!goal && value > 0 && !!from && !!into;
  const saved = goal ? Number(goal.currentAmount) : 0;
  const target = goal ? Number(goal.targetAmount) : 0;
  const percentAfter = target > 0 ? Math.min(100, Math.round(((saved + value) / target) * 100)) : 0;
  const fromAfter = from ? Number(from.currentBalance) - value : 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending || !goal) return;
    startTransition(async () => {
      const result = await addContributionAction(businessId, goal.id, { date, moneyAccountId: fromId, toAccountId: intoId, amount: value, notes: note.trim() || undefined });
      if (result.success) {
        toast.success(t("Money added"));
        onClose();
        router.refresh();
      } else {
        toast.error(savingsError(result.message, "Failed to add money", t, currency, fmt));
      }
    });
  }

  const label = (text: string, optional = false) => (
    <span className="text-body font-medium text-ink">
      {text} {optional && <span className="font-normal text-ink-muted">({t("optional")})</span>}
    </span>
  );

  return (
    <Drawer
      open={open}
      width={460}
      icon={
        goal && (
          <GoalRing percent={goal.progressPercent} color={goalColor(goalIndex, goal.status)} size={52} label={t("{percent}% saved", { percent: formatCount(goal.progressPercent, fmt) })} className="-my-1">
            <span className="text-caption font-bold">{formatCount(goal.progressPercent, fmt)}%</span>
          </GoalRing>
        )
      }
      title={goal ? t("Add money to {name}", { name: goal.name }) : t("Add money")}
      description={goal && <span className="tabular-nums">{`${t("{saved} of {target}", { saved: formatCurrency(goal.currentAmount, currency, fmt), target: formatCurrency(goal.targetAmount, currency, fmt) })} · ${t(goalBadge(goal).label)}`}</span>}
      busy={isPending}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={!valid || isPending} className="px-4.5">
            {isPending && <Loader size={16} onDark label={t("Loading...")} />}
            {value > 0 ? t("Add {amount}", { amount: formatCurrency(value, currency, fmt) }) : t("Add money")}
          </Button>
        </>
      }
    >
      {/* The board's 18px between fields. */}
      <div className="flex flex-col gap-4.5">
        <Field htmlFor="add-amount" label={label(t("Amount"))}>
          <AmountInput id="add-amount" value={amount} onChange={setAmount} currency={currency} autoFocus />
          {goal && (
            <div className="flex flex-wrap gap-1.5">
              {quickAmounts(goal).map((pick) => (
                <button
                  key={`${pick.kind}-${pick.amount}`}
                  type="button"
                  onClick={() => setAmount(String(pick.amount))}
                  className={cn(
                    "h-7.5 rounded-full border px-3 text-caption tabular-nums transition-colors pointer-coarse:h-11",
                    pick.kind === "monthly" ? "border-emerald-line bg-emerald-soft font-semibold text-emerald hover:bg-mint-50" : "border-line bg-surface font-medium text-ink-2 hover:border-line-strong",
                  )}
                >
                  {pick.kind === "monthly" && `${t("Monthly target")} · `}
                  {pick.kind === "rest" && `${t("All that's left")} · `}
                  {formatCurrency(pick.amount, currency, fmt)}
                </button>
              ))}
            </div>
          )}
        </Field>

        {/* Wallets that can't cover the amount are greyed out. */}
        <WalletPicker label={t("Take it from")} balanceLabel="Available@@balance" tone="sand" wallets={wallets} value={fromId} onChange={setFromId} after={null} minBalance={value} currency={currency} loading={loading} error={load?.moneyError ?? null} onClose={onClose} />
        <WalletPicker label={t("Keep it in")} variant="savings" wallets={savingsWallets} value={intoId} onChange={setIntoId} after={null} currency={currency} loading={loading} error={load?.savingsError ?? null} onClose={onClose} />
        {loadFailed && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setLoad(null);
              setAttempt((count) => count + 1);
            }}
            className="self-start pointer-coarse:h-11"
          >
            <RefreshCw aria-hidden="true" />
            {t("Try again")}
          </Button>
        )}

        <div className="grid gap-2.5 md:grid-cols-[150px_minmax(0,1fr)]">
          <Field htmlFor="add-date" label={label(t("Date"))}>
            <DayInput id="add-date" size="md" value={date} onChange={setDate} max={getAppToday()} />
          </Field>
          <Field htmlFor="add-note" label={label(t("Note"), true)}>
            <Input id="add-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder={t("e.g. October deposit")} className="px-0" frameClassName="px-3" />
          </Field>
        </div>

        {goal && value > 0 && (
          <div className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-strip px-4 py-3.5 text-small tabular-nums">
            <span className="text-caption font-semibold tracking-[0.04em] text-ink-muted uppercase">{t("After this")}</span>
            <div className="flex justify-between gap-3">
              <span className="truncate text-ink-2">{goal.name}</span>
              <span>
                <span className="text-ink-muted">{formatCount(goal.progressPercent, fmt)}% → </span>
                <span className="font-semibold text-income">
                  {formatCount(percentAfter, fmt)}% · {formatCurrency(saved + value, currency, fmt)}
                </span>
              </span>
            </div>
            {from && (
              <div className="flex justify-between gap-3">
                <span className="truncate text-ink-2">{accountDisplayName(from, displayLanguage(locale))}</span>
                <span>
                  <span className="text-ink-muted">{formatCurrency(from.currentBalance, currency, fmt)} → </span>
                  {/* Below zero: the wallet doesn't hold this much. */}
                  <span className={cn("font-semibold", fromAfter < 0 ? "text-expense" : "text-ink")}>
                    {formatCurrency(fromAfter, currency, fmt)}
                    {fromAfter < 0 && ` · ${t("not enough")}`}
                  </span>
                </span>
              </div>
            )}
            {into && (
              <div className="flex justify-between gap-3">
                <span className="truncate text-ink-2">{accountDisplayName(into, displayLanguage(locale))}</span>
                <span>
                  <span className="text-ink-muted">{formatCurrency(into.currentBalance, currency, fmt)} → </span>
                  <span className="font-semibold text-ink">{formatCurrency(Number(into.currentBalance) + value, currency, fmt)}</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}
