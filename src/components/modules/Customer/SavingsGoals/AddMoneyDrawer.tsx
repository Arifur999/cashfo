"use client";

import { RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import AmountInput from "@/components/modules/Customer/Shared/AmountInput";
import { WalletPicker } from "@/components/modules/Customer/Shared/WalletPicker";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Account, SavingsGoal } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { listMoneyAccountsAction } from "@/lib/customer/quickEntryActions";
import { addContributionAction, listActiveSavingsWalletsAction } from "@/lib/customer/savingsGoalActions";
import { goalBadge, goalColor, quickAmounts, savingsError } from "@/lib/customer/savingsDisplay";
import { getAppToday } from "@/lib/date";
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
  const { t } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
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
        toast.error(savingsError(result.message, "Failed to add money", t, currency));
      }
    });
  }

  const label = (text: string, optional = false) => (
    <span className="text-body font-medium text-ink">
      {text} {optional && <span className="font-normal text-ink-muted">({t("optional")})</span>}
    </span>
  );

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent
        side={wide ? "right" : "bottom"}
        showCloseButton={false}
        className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-115 shadow-drawer data-[side=right]:sm:max-w-115" : "rounded-t-xl data-[side=bottom]:h-[92vh]")}
      >
        <SheetHeader className={cn("flex-row items-center gap-4 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          {goal && (
            <GoalRing percent={goal.progressPercent} color={goalColor(goalIndex, goal.status)} size={52} label={t("{percent}% saved", { percent: goal.progressPercent })}>
              <span className="text-caption font-bold">{goal.progressPercent}%</span>
            </GoalRing>
          )}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <SheetTitle className="truncate text-h3 text-ink">{goal ? t("Add money to {name}", { name: goal.name }) : t("Add money")}</SheetTitle>
            {goal && (
              <span className="text-small text-ink-muted tabular-nums">
                {t("{saved} of {target}", { saved: formatCurrency(goal.currentAmount, currency), target: formatCurrency(goal.targetAmount, currency) })} · {t(goalBadge(goal).label)}
              </span>
            )}
          </span>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken pointer-coarse:size-11">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
            <Field htmlFor="add-amount" label={label(t("Amount"))}>
              <AmountInput id="add-amount" value={amount} onChange={setAmount} currency={currency} autoFocus />
              {goal && (
                <div className="flex flex-wrap gap-2">
                  {quickAmounts(goal).map((pick) => (
                    <button
                      key={`${pick.kind}-${pick.amount}`}
                      type="button"
                      onClick={() => setAmount(String(pick.amount))}
                      className={cn(
                        "h-7.5 rounded-full border px-3 text-caption transition-colors pointer-coarse:h-11",
                        pick.kind === "monthly" ? "border-mint-200 bg-mint-50 font-semibold text-brand-ink hover:bg-mint-200/60" : "border-line bg-surface font-medium text-ink-2 hover:border-line-strong",
                      )}
                    >
                      {pick.kind === "monthly" && `${t("Monthly target")} · `}
                      {pick.kind === "rest" && `${t("All that's left")} · `}
                      {formatCurrency(pick.amount, currency)}
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

            <div className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)]">
              <Field htmlFor="add-date" label={label(t("Date"))}>
                <DayInput id="add-date" size="md" value={date} onChange={setDate} max={getAppToday()} />
              </Field>
              <Field htmlFor="add-note" label={label(t("Note"), true)}>
                <Input id="add-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder={t("e.g. October deposit")} className="px-0" frameClassName="px-3" />
              </Field>
            </div>

            {goal && value > 0 && (
              <div className="flex flex-col gap-3 rounded-md border border-line bg-strip p-4 text-small tabular-nums">
                <span className="text-caption font-semibold text-ink-muted">{t("After this")}</span>
                <div className="flex justify-between gap-3">
                  <span className="truncate text-ink-2">{goal.name}</span>
                  <span>
                    <span className="text-ink-muted">{goal.progressPercent}% → </span>
                    <span className="font-semibold text-income">
                      {percentAfter}% · {formatCurrency(saved + value, currency)}
                    </span>
                  </span>
                </div>
                {from && (
                  <div className="flex justify-between gap-3">
                    <span className="truncate text-ink-2">{from.name}</span>
                    <span>
                      <span className="text-ink-muted">{formatCurrency(from.currentBalance, currency)} → </span>
                      {/* Below zero: the wallet doesn't hold this much. */}
                      <span className={cn("font-semibold", fromAfter < 0 ? "text-expense" : "text-ink")}>
                        {formatCurrency(fromAfter, currency)}
                        {fromAfter < 0 && ` · ${t("not enough")}`}
                      </span>
                    </span>
                  </div>
                )}
                {into && (
                  <div className="flex justify-between gap-3">
                    <span className="truncate text-ink-2">{into.name}</span>
                    <span>
                      <span className="text-ink-muted">{formatCurrency(into.currentBalance, currency)} → </span>
                      <span className="font-semibold text-ink">{formatCurrency(Number(into.currentBalance) + value, currency)}</span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={cn("flex items-center justify-end gap-3 border-t border-line bg-surface", wide ? "px-6 py-4" : "px-4 pt-3 pb-6")}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="action" disabled={!valid || isPending} className="px-5">
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {value > 0 ? t("Add {amount}", { amount: formatCurrency(value, currency) }) : t("Add money")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
