"use client";

import { CalendarDays, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { WalletPicker } from "@/components/modules/Customer/Shared/WalletPicker";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Account, SavingsGoal } from "@/lib/customer/api";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { normalizeMoneyInput } from "@/lib/customer/money";
import { listMoneyAccountsAction } from "@/lib/customer/quickEntryActions";
import { addContributionAction, getActiveSavingsWalletsAction } from "@/lib/customer/savingsGoalActions";
import { goalBadge, goalColor, quickAmounts } from "@/lib/customer/savingsDisplay";
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
  const [wallets, setWallets] = useState<Account[]>([]);
  const [walletsError, setWalletsError] = useState<string | null>(null);
  const [savingsWallets, setSavingsWallets] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setAmount("");
      setNote("");
      setDate(getAppToday());
      setLoading(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    Promise.all([listMoneyAccountsAction(businessId), getActiveSavingsWalletsAction(businessId)]).then(([money, savings]) => {
      const list = money.data ?? [];
      setWallets(list);
      setWalletsError(money.success ? null : (money.message ?? "Failed to load your wallets"));
      setFromId((current) => current || list[0]?.id || "");
      setSavingsWallets(savings);
      setIntoId((current) => current || savings[0]?.id || "");
      setLoading(false);
    });
  }, [open, businessId]);

  const value = Number(amount) || 0;
  const from = wallets.find((w) => w.id === fromId);
  const into = savingsWallets.find((w) => w.id === intoId);
  const valid = !!goal && value > 0 && fromId.length > 0 && intoId.length > 0;
  const saved = goal ? Number(goal.currentAmount) : 0;
  const target = goal ? Number(goal.targetAmount) : 0;
  const percentAfter = target > 0 ? Math.min(100, Math.round(((saved + value) / target) * 100)) : 0;

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
        toast.error(result.message ?? t("Failed to add money"));
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
        className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-115 shadow-[-28px_0_60px_-16px_rgba(11,61,46,0.3)] sm:max-w-115" : "h-[92vh] rounded-t-xl")}
      >
        <SheetHeader className={cn("flex-row items-center gap-4 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          {goal && (
            <GoalRing percent={goal.progressPercent} color={goalColor(goalIndex, goal.status)} size={52} label={`${goal.progressPercent}% ${t("saved")}`}>
              <span className="text-caption font-bold">{goal.progressPercent}%</span>
            </GoalRing>
          )}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <SheetTitle className="truncate text-h3 text-ink">
              {t("Add money to")} {goal?.name}
            </SheetTitle>
            {goal && (
              <span className="text-small text-ink-muted tabular-nums">
                {formatCurrency(goal.currentAmount, currency)} {t("of")} {formatCurrency(goal.targetAmount, currency)} · {t(goalBadge(goal).label)}
              </span>
            )}
          </span>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
            <Field htmlFor="add-amount" label={label(t("Amount"))}>
              <Input
                id="add-amount"
                type="text"
                inputMode="decimal"
                size="xl"
                value={amount}
                onChange={(event) => setAmount(normalizeMoneyInput(event.target.value))}
                placeholder="0"
                autoFocus
                leading={<span className="flex h-14 w-13 items-center justify-center border-r border-line bg-cream text-h2 font-semibold text-ink-2">{currencySymbol(currency)}</span>}
                frameClassName="h-14 gap-0 overflow-hidden pl-0"
                className="pl-4 text-h2 tabular-nums"
              />
              {goal && (
                <div className="flex flex-wrap gap-2">
                  {quickAmounts(goal).map((pick) => (
                    <button key={`${pick.kind}-${pick.amount}`} type="button" onClick={() => setAmount(String(pick.amount))} className={cn("h-7.5 rounded-full border px-3 text-caption transition-colors", pick.kind === "monthly" ? "border-mint-200 bg-mint-50 font-semibold text-emerald hover:bg-mint-200/60" : "border-line bg-surface font-medium text-ink-2 hover:border-line-strong")}>
                      {pick.kind === "monthly" && `${t("Monthly target")} · `}
                      {pick.kind === "rest" && `${t("All that's left")} · `}
                      {formatCurrency(pick.amount, currency)}
                    </button>
                  ))}
                </div>
              )}
            </Field>

            <WalletPicker label={t("Take it from")} wallets={wallets} value={fromId} onChange={setFromId} after={from ? Number(from.currentBalance) - value : null} currency={currency} loading={loading} error={walletsError} onClose={onClose} />
            <WalletPicker label={t("Keep it in")} variant="savings" wallets={savingsWallets} value={intoId} onChange={setIntoId} after={null} currency={currency} loading={loading} error={null} onClose={onClose} />

            <div className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)]">
              <Field htmlFor="add-date" label={label(t("Date"))}>
                <Input id="add-date" type="date" size="md" value={date} onChange={(event) => setDate(event.target.value)} max={getAppToday()} leading={<CalendarDays />} className="px-0" frameClassName="px-3" />
              </Field>
              <Field htmlFor="add-note" label={label(t("Note"), true)}>
                <Input id="add-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder={t("e.g. October deposit")} className="px-0" frameClassName="px-3" />
              </Field>
            </div>

            {goal && value > 0 && (
              <div className="flex flex-col gap-3 rounded-md border border-line bg-cream p-4 text-small tabular-nums">
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
                      <span className="font-semibold text-ink">{formatCurrency(Number(from.currentBalance) - value, currency)}</span>
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
              {t("Add")} {value > 0 ? formatCurrency(value, currency) : t("money")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
