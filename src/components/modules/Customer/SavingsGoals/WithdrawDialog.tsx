"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import IconTile from "@/components/smartly/IconTile";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Account, SavingsGoal } from "@/lib/customer/api";
import { listBudgetCategoryNamesAction } from "@/lib/customer/budgetActions";
import { formatCurrency } from "@/lib/customer/currency";
import { listExpenseAccountsAction } from "@/lib/customer/quickEntryActions";
import { listActiveSavingsWalletsAction, withdrawSavingsGoalAction } from "@/lib/customer/savingsGoalActions";
import { savingsError, walletThatCovers } from "@/lib/customer/savingsDisplay";
import { getAppToday } from "@/lib/date";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface WithdrawDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  goal: SavingsGoal | null;
  currency: string;
}

// Which of the three reads failed (offline, an outage). Each is said so,
// with Try again, rather than read as "No savings wallet yet", "No expense
// category yet" or "No expense account exists".
interface Failed {
  wallets: boolean;
  accounts: boolean;
  categories: boolean;
}

interface Loaded {
  wallets: Account[];
  expenseAccounts: Account[];
  categories: { name: string }[];
  failed: Failed;
}

const ALL_FAILED: Failed = { wallets: true, accounts: true, categories: true };

// Cash a goal out: the whole saved amount leaves a savings wallet and is
// spent as an expense, and the goal closes for good -- so it asks twice.
export function WithdrawDialog({ open, onClose, businessId, goal, currency }: WithdrawDialogProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [walletId, setWalletId] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(getAppToday());
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [isPending, startTransition] = useTransition();
  const goalAmount = goal ? Number(goal.currentAmount) : 0;

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setDate(getAppToday());
      setNote("");
      setConfirmed(false);
      // Asked every time: an unnoticed default would count the withdrawal
      // against that category's budget.
      setCategory("");
      setLoaded(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    // A late reply (the dialog closed, or a retry started) is dropped; one
    // that never comes ends as a failure, not a spinner for good.
    let cancelled = false;
    Promise.all([listActiveSavingsWalletsAction(businessId), listExpenseAccountsAction(businessId), listBudgetCategoryNamesAction(businessId, "EXPENSE")])
      .then(([savings, accounts, names]) => {
        if (cancelled) return;
        const wallets = savings.data ?? [];
        setLoaded({
          wallets,
          expenseAccounts: accounts.data ?? [],
          categories: names.data ?? [],
          failed: { wallets: !savings.success, accounts: !accounts.success, categories: !names.success },
        });
        // The whole amount leaves one wallet, so start on one that holds it.
        setWalletId((current) => (wallets.some((wallet) => wallet.id === current && Number(wallet.currentBalance) >= goalAmount) ? current : walletThatCovers(wallets, goalAmount)));
      })
      .catch(() => {
        if (!cancelled) setLoaded({ wallets: [], expenseAccounts: [], categories: [], failed: ALL_FAILED });
      });
    return () => {
      cancelled = true;
    };
  }, [open, businessId, attempt, goalAmount]);

  const loading = loaded === null;
  const wallets = loaded?.wallets ?? [];
  const expenseAccounts = loaded?.expenseAccounts ?? [];
  const categories = loaded?.categories ?? [];
  const failed = loaded?.failed;
  // One line for each read that failed, above the one Try again.
  const failures = [
    failed?.wallets && t("Couldn't load your savings wallets."),
    failed?.accounts && t("Failed to load your expense accounts"),
    failed?.categories && t("Failed to load your categories"),
  ].filter((line): line is string => !!line);
  const covering = wallets.filter((wallet) => Number(wallet.currentBalance) >= goalAmount);
  // The expense posts against a real expense account; the category is its
  // label. Best-effort match by name, else the first one.
  const expenseAccountId = expenseAccounts.find((account) => account.name.toLowerCase().includes(category.toLowerCase()))?.id ?? expenseAccounts[0]?.id ?? "";
  // A category is needed whenever there are some to pick, and still when
  // they couldn't be read: an outage can't withdraw into no category.
  const categoryReady = categories.length > 0 ? category.length > 0 : !failed?.categories;
  const valid = !!goal && covering.some((wallet) => wallet.id === walletId) && expenseAccountId.length > 0 && categoryReady && confirmed;
  const amount = goal ? formatCurrency(goal.currentAmount, currency, locale) : "";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending || !goal) return;
    startTransition(async () => {
      const result = await withdrawSavingsGoalAction(businessId, goal.id, { date, savingsAccountId: walletId, expenseAccountId, categoryId: category || undefined, notes: note.trim() || undefined });
      if (result.success) {
        toast.success(t("Withdrawn and recorded as an expense"));
        onClose();
        router.refresh();
      } else {
        toast.error(savingsError(result.message, "Failed to withdraw", t, currency, locale));
      }
    });
  }

  const label = (text: string, optional = false) => (
    <span className="text-body font-medium text-ink">
      {text} {optional && <span className="font-normal text-ink-muted">({t("optional")})</span>}
    </span>
  );

  const retry = () => {
    setLoaded(null);
    setAttempt((count) => count + 1);
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      {/* Scrolls on a short phone or with the keyboard up, so the title and
          the Withdraw button stay reachable. */}
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] w-130 max-w-[calc(100vw-32px)] gap-0 overflow-y-auto rounded-lg border border-line bg-surface p-6 shadow-overlay ring-0">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <IconTile tone="expense" size={44}>
              <TriangleAlert />
            </IconTile>
            <div className="flex min-w-0 flex-col gap-2">
              <AlertDialogTitle className="text-h3 text-ink">{t("Withdraw everything from {name}?", { name: goal?.name ?? "" })}</AlertDialogTitle>
              <AlertDialogDescription className="text-body leading-relaxed text-ink-2">
                {fillNodes(t("The full {amount} leaves your savings wallet and is recorded as an expense. The goal is marked Withdrawn, and {undone}."), {
                  amount: <b className="font-semibold text-ink">{amount}</b>,
                  undone: <b className="font-semibold text-ink">{t("this can't be undone")}</b>,
                })}
              </AlertDialogDescription>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field htmlFor="wd-from" label={label(t("From savings wallet"))}>
              <NativeSelect id="wd-from" size="md" value={walletId} onChange={(event) => setWalletId(event.target.value)} disabled={loading}>
                {loading && <option value="">{t("Loading...")}</option>}
                {!loading && wallets.length === 0 && <option value="">{failed?.wallets ? t("Couldn't load your savings wallets.") : t("No savings wallet yet")}</option>}
                {!loading && wallets.length > 0 && covering.length === 0 && <option value="">{t("Pick a savings wallet")}</option>}
                {wallets.map((wallet) => {
                  // A withdrawal takes the goal's whole amount from one wallet.
                  const short = Number(wallet.currentBalance) < goalAmount;
                  return (
                    <option key={wallet.id} value={wallet.id} disabled={short}>
                      {`${wallet.name} · ${formatCurrency(wallet.currentBalance, currency, locale)}${short ? ` · ${t("not enough")}` : ""}`}
                    </option>
                  );
                })}
              </NativeSelect>
            </Field>
            <Field htmlFor="wd-cat" label={label(t("Spend as"))}>
              <NativeSelect id="wd-cat" size="md" value={category} onChange={(event) => setCategory(event.target.value)} disabled={loading} required={categories.length > 0}>
                {categories.length === 0 ? (
                  <option value="">{loading ? t("Loading...") : failed?.categories ? t("Failed to load your categories") : t("No expense category yet")}</option>
                ) : (
                  <option value="" disabled>
                    {t("Pick a category")}
                  </option>
                )}
                {categories.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field htmlFor="wd-date" label={label(t("Date"))}>
              <DayInput id="wd-date" size="md" value={date} onChange={setDate} max={getAppToday()} />
            </Field>
            <Field htmlFor="wd-note" label={label(t("Note"), true)}>
              <Input id="wd-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder={t("Bought the laptop")} className="px-0" frameClassName="px-3" />
            </Field>
          </div>
          {failures.length > 0 && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-strip px-4 py-3 text-small text-ink-2">
              <span className="flex min-w-0 flex-col gap-0.5">
                {failures.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </span>
              <Button type="button" variant="secondary" size="sm" onClick={retry} className="pointer-coarse:h-11">
                <RefreshCw aria-hidden="true" />
                {t("Try again")}
              </Button>
            </div>
          )}
          {!loading && !failed?.wallets && wallets.length > 0 && covering.length === 0 && (
            <p className="text-caption text-expense">{t("No savings wallet holds {amount} on its own, so this goal can't be withdrawn yet.", { amount })}</p>
          )}
          {!loading && !failed?.accounts && expenseAccounts.length === 0 && <p className="text-caption text-expense">{t("No expense account exists in this workspace yet -- add one in Chart of Accounts first.")}</p>}

          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-expense-line bg-expense-soft px-4 py-3 text-small text-expense">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="size-4.5 shrink-0 accent-expense" />
            {t("I understand {name} will be closed for good.", { name: goal?.name ?? "" })}
          </label>

          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Keep saving")}
            </Button>
            <Button type="submit" variant="danger" disabled={!valid || isPending}>
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {t("Withdraw {amount}", { amount })}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
