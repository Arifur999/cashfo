"use client";

import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import IconTile from "@/components/smartly/IconTile";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Account, SavingsGoal } from "@/lib/customer/api";
import { getBudgetCategoryNamesAction } from "@/lib/customer/budgetActions";
import { formatCurrency } from "@/lib/customer/currency";
import { getExpenseAccountsAction } from "@/lib/customer/quickEntryActions";
import { getActiveSavingsWalletsAction, withdrawSavingsGoalAction } from "@/lib/customer/savingsGoalActions";
import { getAppToday } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface WithdrawDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  goal: SavingsGoal | null;
  currency: string;
}

// Cash a goal out: the whole saved amount leaves a savings wallet and is
// spent as an expense, and the goal closes for good -- so it asks twice.
export function WithdrawDialog({ open, onClose, businessId, goal, currency }: WithdrawDialogProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [walletId, setWalletId] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(getAppToday());
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [wallets, setWallets] = useState<Account[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<{ name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setDate(getAppToday());
      setNote("");
      setConfirmed(false);
      setLoading(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    Promise.all([getActiveSavingsWalletsAction(businessId), getExpenseAccountsAction(businessId), getBudgetCategoryNamesAction(businessId, "EXPENSE")]).then(([savings, accounts, names]) => {
      setWallets(savings);
      setWalletId((current) => current || savings[0]?.id || "");
      setExpenseAccounts(accounts);
      setCategories(names);
      setCategory((current) => current || names[0]?.name || "");
      setLoading(false);
    });
  }, [open, businessId]);

  // The expense posts against a real expense account; the category is its
  // label. Best-effort match by name, else the first one.
  const expenseAccountId = expenseAccounts.find((account) => account.name.toLowerCase().includes(category.toLowerCase()))?.id ?? expenseAccounts[0]?.id ?? "";
  const valid = !!goal && walletId.length > 0 && expenseAccountId.length > 0 && confirmed;
  const amount = goal ? formatCurrency(goal.currentAmount, currency) : "";

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
        toast.error(result.message ?? t("Failed to withdraw"));
      }
    });
  }

  const label = (text: string, optional = false) => (
    <span className="text-body font-medium text-ink">
      {text} {optional && <span className="font-normal text-ink-muted">({t("optional")})</span>}
    </span>
  );

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-130 max-w-[calc(100vw-32px)] gap-0 rounded-lg border border-line bg-surface p-6 shadow-overlay ring-0">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <IconTile tone="expense" size={44}>
              <TriangleAlert />
            </IconTile>
            <div className="flex min-w-0 flex-col gap-2">
              <AlertDialogTitle className="text-h3 text-ink">
                {t("Withdraw everything from")} {goal?.name}?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-body leading-relaxed text-ink-2">
                {t("The full")} <b className="font-semibold text-ink">{amount}</b> {t("leaves your savings wallet and is recorded as an expense. The goal is marked Withdrawn, and")} <b className="font-semibold text-ink">{t("this can't be undone")}</b>.
              </AlertDialogDescription>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field htmlFor="wd-from" label={label(t("From savings wallet"))}>
              <NativeSelect id="wd-from" size="md" value={walletId} onChange={(event) => setWalletId(event.target.value)} disabled={loading}>
                {wallets.length === 0 && <option value="">{t("No savings wallet yet")}</option>}
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field htmlFor="wd-cat" label={label(t("Spend as"))}>
              <NativeSelect id="wd-cat" size="md" value={category} onChange={(event) => setCategory(event.target.value)} disabled={loading}>
                {categories.length === 0 && <option value="">{t("No expense category yet")}</option>}
                {categories.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field htmlFor="wd-date" label={label(t("Date"))}>
              <Input id="wd-date" type="date" size="md" value={date} onChange={(event) => setDate(event.target.value)} max={getAppToday()} className="px-0" frameClassName="px-3" />
            </Field>
            <Field htmlFor="wd-note" label={label(t("Note"), true)}>
              <Input id="wd-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder={t("Bought the laptop")} className="px-0" frameClassName="px-3" />
            </Field>
          </div>
          {!loading && expenseAccounts.length === 0 && <p className="text-caption text-expense">{t("No expense account exists in this workspace yet -- add one in Chart of Accounts first.")}</p>}

          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-[#F2C9C0] bg-expense-soft px-4 py-3 text-small text-expense dark:border-expense/40">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="size-4.5 shrink-0 accent-expense" />
            {t("I understand")} {goal?.name} {t("will be closed for good.")}
          </label>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Keep saving")}
            </Button>
            <Button type="submit" variant="danger" disabled={!valid || isPending}>
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {t("Withdraw")} {amount}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
