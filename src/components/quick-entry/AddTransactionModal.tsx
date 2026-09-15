"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/Combobox";
import { DatePicker } from "@/components/ui/DatePicker";
import { Modal } from "@/components/ui/Modal";
import type { Account } from "@/lib/api";
import { getBudgetCategoryNamesAction } from "@/lib/budgetActions";
import { currencySymbol } from "@/lib/currency";
import { createExpenseAction, createIncomeAction, getExpenseAccountsAction, getMoneyAccountsAction } from "@/lib/quickEntryActions";

interface AddTransactionModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
}

type EntryKind = "EXPENSE" | "INCOME";

// One form covering both Income and Expense (Transfer already has its own
// dedicated flow at /balance/transfer, reachable from the sidebar, so it
// isn't a third tab here). Switching the tab swaps which category list and
// which account-picker label apply, rather than mounting two separate forms,
// so the amount/date/notes the user already typed survive a tab switch.
export function AddTransactionModal({ open, onClose, businessId, currency }: AddTransactionModalProps) {
  const router = useRouter();
  const [kind, setKind] = useState<EntryKind>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("");
  const [accountId, setAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [moneyAccounts, setMoneyAccounts] = useState<Account[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);
  const [customExpenseCategories, setCustomExpenseCategories] = useState<string[]>([]);
  const [customIncomeCategories, setCustomIncomeCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  // Bumped every time the modal reopens -- combined with `kind` below to key
  // the Category Combobox, so it fully remounts (fresh internal typed-text
  // state) at both moments `category` gets reset to "" here and in
  // selectKind(), instead of needing a value-sync effect inside Combobox.
  const [resetCount, setResetCount] = useState(0);

  // Reset the instant the modal transitions closed -> open (render-time
  // state adjustment, same pattern as CreateWorkspaceModal).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setKind("EXPENSE");
      setAmount("");
      setDate(new Date().toISOString().slice(0, 10));
      setCategory("");
      setAccountId("");
      setNotes("");
      setLoading(true);
      setResetCount((c) => c + 1);
    }
  }

  useEffect(() => {
    if (!open) return;
    Promise.all([
      getMoneyAccountsAction(businessId),
      getExpenseAccountsAction(businessId),
      getBudgetCategoryNamesAction(businessId, "EXPENSE"),
      getBudgetCategoryNamesAction(businessId, "INCOME"),
    ]).then(([money, expense, budgetCategories, incomeCategories]) => {
      setMoneyAccounts(money);
      setExpenseAccounts(expense);
      setCustomExpenseCategories(budgetCategories.map((c) => c.name));
      setCustomIncomeCategories(incomeCategories.map((c) => c.name));
      setLoading(false);
    });
  }, [open, businessId]);

  // Switching tabs resets the category (the two types don't share a list)
  // and the account choice (a money account picked for "where it landed"
  // doesn't necessarily make sense re-read as "paid from", so don't carry
  // a stale selection across the switch silently).
  function selectKind(next: EntryKind) {
    setKind(next);
    setCategory("");
    setAccountId("");
  }

  // Categories come entirely from Expense Category / Income Category now --
  // no more hardcoded fallback lists. A workspace with no categories yet
  // sees an empty dropdown + a link to go create one there (see the
  // empty-state hint below) rather than a generic bucket that wouldn't
  // track against any budget/goal.
  const categories = kind === "INCOME" ? customIncomeCategories : customExpenseCategories;
  // Every Expense posting needs a real Chart-of-Accounts EXPENSE account
  // behind it (unlike Income, which has a workspace-wide default -- see
  // QuickEntriesService.getDefaultIncomeAccountId()) -- the Budget Category
  // picked above is just a free-text label (categoryId), not itself an
  // Account. Best-effort match it to a same-named EXPENSE account, else
  // fall back to the first one; if the workspace has NONE at all (seeding
  // gap), there's nothing valid to submit, so isValid blocks it instead of
  // silently sending an empty expenseAccountId and surfacing the backend's
  // raw "should not be empty" validation error.
  const resolvedExpenseAccountId = expenseAccounts.find((a) => a.name.toLowerCase().includes(category.toLowerCase()))?.id ?? expenseAccounts[0]?.id ?? "";
  const isValid =
    Number(amount) > 0 && accountId.length > 0 && category.length > 0 && (kind === "INCOME" || resolvedExpenseAccountId.length > 0);

  function handleSubmit() {
    startTransition(async () => {
      const result =
        kind === "INCOME"
          ? await createIncomeAction(businessId, {
              toAccountId: accountId,
              amount: Number(amount),
              date,
              categoryId: category,
              note: notes || undefined,
            })
          : await createExpenseAction(businessId, {
              fromAccountId: accountId,
              expenseAccountId: resolvedExpenseAccountId,
              amount: Number(amount),
              date,
              categoryId: category,
              note: notes || undefined,
            });

      if (result.success) {
        toast.success(kind === "INCOME" ? "Income added" : "Expense added");
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to save transaction");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Transaction" size="lg">
      <div className="space-y-4">
        <div className="flex gap-2 rounded-xl bg-neutral-50 p-1">
          <button
            type="button"
            onClick={() => selectKind("INCOME")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
              kind === "INCOME" ? "bg-surface text-brand-primary shadow-sm ring-2 ring-brand-primary" : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Income
          </button>
          <button
            type="button"
            onClick={() => selectKind("EXPENSE")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
              kind === "EXPENSE" ? "bg-surface text-brand-danger shadow-sm ring-2 ring-brand-danger" : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Expense
          </button>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Date</label>
          <DatePicker value={date} onChange={setDate} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Category</label>
            <Combobox
              key={`${kind}-${resetCount}`}
              value={category}
              onChange={setCategory}
              options={categories}
              placeholder="Select a category"
              emptyMessage="No matching category"
              disabled={loading}
            />
            {!loading && categories.length === 0 && (
              <p className="mt-1 text-xs text-neutral-400">
                No categories yet --{" "}
                <Link href={`/categories?addType=${kind}`} className="font-medium text-brand-primary hover:underline">
                  add one under {kind === "INCOME" ? "Income" : "Expense"} Categories
                </Link>
                .
              </p>
            )}
            {!loading && kind === "EXPENSE" && expenseAccounts.length === 0 && (
              <p className="mt-1 text-xs text-brand-danger">No expense account exists in this workspace yet -- add one in Chart of Accounts first.</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              {kind === "INCOME" ? "Deposit to" : "Pay from"}
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary disabled:bg-neutral-50"
            >
              <option value="" disabled>
                Select an account
              </option>
              {moneyAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Amount</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-400">
              {currencySymbol(currency)}
            </span>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={`w-full rounded-xl border border-neutral-200 py-2.5 pl-8 pr-3 text-sm font-semibold tabular-nums outline-none focus:ring-2 ${
                kind === "INCOME"
                  ? "text-brand-primary focus:border-brand-primary focus:ring-brand-primary/20"
                  : "text-brand-danger focus:border-brand-danger focus:ring-brand-danger/20"
              }`}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Notes <span className="text-neutral-400">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Add any additional details..."
            className="w-full resize-none rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!isValid || isPending}
          onClick={handleSubmit}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Transaction
        </button>
      </div>
    </Modal>
  );
}
