"use client";

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarDays, ChevronDown, CreditCard, Landmark, LayoutGrid, Smartphone, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createElement, useEffect, useId, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import Kbd from "@/components/smartly/Kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Account, BudgetOverview } from "@/lib/customer/api";
import { getBudgetCategoryNamesAction, getBudgetOverviewAction, type BudgetCategoryName } from "@/lib/customer/budgetActions";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { appYearMonth } from "@/lib/customer/dateRangePresets";
import { limitMoneyDecimals } from "@/lib/customer/money";
import { createExpenseAction, createIncomeAction, createTransferAction, getExpenseAccountsAction, listMoneyAccountsAction } from "@/lib/customer/quickEntryActions";
import { getAppToday } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export type EntryKind = "INCOME" | "EXPENSE" | "TRANSFER";

interface TransactionDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
  // Which tab is open when the drawer opens.
  initialKind?: EntryKind;
}

const TILE_LIMIT = 7;

const KIND_META: Record<EntryKind, { label: string; icon: React.ReactNode; active: string; save: string; done: string; failed: string }> = {
  INCOME: { label: "Income", icon: <ArrowUpRight className="text-income" strokeWidth={2.25} />, active: "text-income", save: "Save income", done: "Income added", failed: "Failed to add income" },
  EXPENSE: { label: "Expense", icon: <ArrowDownLeft className="text-expense" strokeWidth={2.25} />, active: "text-expense", save: "Save expense", done: "Expense added", failed: "Failed to add expense" },
  TRANSFER: { label: "Transfer", icon: <ArrowLeftRight className="text-info" />, active: "text-ink", save: "Move money", done: "Transfer completed", failed: "Failed to create transfer" },
};

function walletIcon(account: Account) {
  switch (account.accountSubtype) {
    case "bank":
      return Landmark;
    case "mfs":
      return Smartphone;
    default:
      return CreditCard;
  }
}

// New transaction: Income, Expense or Transfer in one drawer -- the amount
// first, the category tiles, the wallet with what it will hold after this,
// the date and a note. On phones it comes up from the bottom. Enter saves;
// "Save & add another" keeps it open and clears the amount and note.
export function TransactionDrawer({ open, onClose, businessId, currency, initialKind = "EXPENSE" }: TransactionDrawerProps) {
  const { t } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const [kind, setKind] = useState<EntryKind>(initialKind);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [date, setDate] = useState(getAppToday());
  const [note, setNote] = useState("");
  const [wallets, setWallets] = useState<Account[]>([]);
  const [walletsError, setWalletsError] = useState<string | null>(null);
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Record<"INCOME" | "EXPENSE", BudgetCategoryName[]>>({ INCOME: [], EXPENSE: [] });
  const [budget, setBudget] = useState<BudgetOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const amountId = useId();

  // Reset the instant the drawer transitions closed → open (React's
  // render-time pattern for "reset state when a prop changes").
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setKind(initialKind);
      setAmount("");
      setCategory("");
      setShowAll(false);
      setAccountId("");
      setToAccountId("");
      setDate(getAppToday());
      setNote("");
      setLoading(true);
      setWalletsError(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    const { year, month } = appYearMonth();
    Promise.all([
      listMoneyAccountsAction(businessId),
      getExpenseAccountsAction(businessId),
      getBudgetCategoryNamesAction(businessId, "EXPENSE"),
      getBudgetCategoryNamesAction(businessId, "INCOME"),
      getBudgetOverviewAction(businessId, month, year),
    ]).then(([money, expense, expenseCategories, incomeCategories, overview]) => {
      const list = money.data ?? [];
      setWallets(list);
      setWalletsError(money.success ? null : (money.message ?? "Failed to load your wallets"));
      setAccountId((current) => current || list[0]?.id || "");
      setToAccountId((current) => current || list[1]?.id || "");
      setExpenseAccounts(expense);
      setCategories({ EXPENSE: expenseCategories, INCOME: incomeCategories });
      setBudget(overview);
      setLoading(false);
    });
  }, [open, businessId]);

  const isTransfer = kind === "TRANSFER";
  const options = isTransfer ? [] : categories[kind];
  const visible = showAll || options.length <= TILE_LIMIT + 1 ? options : options.slice(0, TILE_LIMIT);
  const wallet = wallets.find((w) => w.id === accountId);
  const toWallet = wallets.find((w) => w.id === toAccountId);
  const value = Number(amount) || 0;
  const after = wallet ? Number(wallet.currentBalance) + (kind === "INCOME" ? value : -value) : null;
  const toAfter = toWallet ? Number(toWallet.currentBalance) + value : null;
  const budgetRow = kind === "EXPENSE" && category ? budget?.categories.find((c) => c.name === category) : undefined;
  const budgetLimit = budgetRow?.monthlyLimit ? Number(budgetRow.monthlyLimit) : 0;
  const budgetLeft = budgetRow ? budgetLimit - Number(budgetRow.spent) : 0;
  // An expense posts against a real expense account; the budget category is
  // only its label. Best-effort match by name, else the first one.
  const expenseAccountId = expenseAccounts.find((a) => a.name.toLowerCase().includes(category.toLowerCase()))?.id ?? expenseAccounts[0]?.id ?? "";
  const valid =
    value > 0 &&
    accountId.length > 0 &&
    (isTransfer ? toAccountId.length > 0 && toAccountId !== accountId : (options.length === 0 || category.length > 0) && (kind === "INCOME" || expenseAccountId.length > 0));

  function switchKind(next: EntryKind) {
    setKind(next);
    setCategory("");
    setShowAll(false);
  }

  function save(another: boolean) {
    if (!valid || isPending) return;
    startTransition(async () => {
      const result =
        kind === "INCOME"
          ? await createIncomeAction(businessId, { toAccountId: accountId, amount: value, date, categoryId: category || undefined, note: note || undefined })
          : kind === "EXPENSE"
            ? await createExpenseAction(businessId, { fromAccountId: accountId, expenseAccountId, amount: value, date, categoryId: category || undefined, note: note || undefined })
            : await createTransferAction(businessId, { fromAccountId: accountId, toAccountId, amount: value, date, description: note || undefined });
      if (!result.success) {
        toast.error(result.message ?? t(KIND_META[kind].failed));
        return;
      }
      toast.success(t(KIND_META[kind].done));
      router.refresh();
      if (another) {
        setAmount("");
        setNote("");
        // Refresh the balances the next entry will show.
        const money = await listMoneyAccountsAction(businessId);
        if (money.success && money.data) setWallets(money.data);
        document.getElementById(amountId)?.focus();
      } else {
        onClose();
      }
    });
  }

  const body = (
    <>
      <div className="grid grid-cols-3 gap-1 rounded-md bg-surface-sunken p-1">
        {(["INCOME", "EXPENSE", "TRANSFER"] as EntryKind[]).map((option) => {
          const on = option === kind;
          return (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => switchKind(option)}
              className={cn("flex h-9 items-center justify-center gap-2 rounded-sm text-body transition-colors [&_svg]:size-[15px]", on ? cn("bg-surface font-semibold shadow-card", KIND_META[option].active) : "font-medium text-ink-2 hover:text-ink")}
            >
              {KIND_META[option].icon}
              {t(KIND_META[option].label)}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={amountId} className="text-body font-medium text-ink md:block hidden">
          {t("Amount")}
        </label>
        <div
          className={cn(
            "flex items-center gap-3 rounded-md",
            wide ? "h-16 border border-line-strong bg-surface px-4 focus-within:border-emerald focus-within:shadow-[0_0_0_3px_rgba(31,122,90,0.18)]" : "justify-center py-2",
          )}
        >
          <span className={cn("text-h1 font-semibold", kind === "INCOME" ? "text-income" : kind === "EXPENSE" ? "text-expense" : "text-ink-muted")}>{kind === "INCOME" ? "+" : kind === "EXPENSE" ? "−" : "↔"}</span>
          <span className="text-h1 font-semibold text-ink-2">{currencySymbol(currency)}</span>
          <input
            id={amountId}
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(limitMoneyDecimals(event.target.value.replace(/[^\d.]/g, "")))}
            placeholder="0"
            autoFocus
            aria-label={t("Amount")}
            className={cn("min-w-0 flex-1 bg-transparent font-bold text-ink tabular-nums outline-none placeholder:text-ink-faint", wide ? "text-h1 tracking-[-0.02em]" : "w-40 text-center text-display-xl")}
          />
        </div>
        {!wide && budgetRow && (
          <span className="self-center text-small text-ink-muted">
            {category} {t("has")} <b className="text-ink">{formatCurrency(budgetLeft - value, currency)}</b> {t("left after this")}
          </span>
        )}
      </div>

      {!isTransfer && (
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="mb-2 text-body font-medium text-ink">{t("Category")}</legend>
          {loading ? (
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }, (_, i) => (
                <span key={i} className="h-21 animate-pulse rounded-md bg-surface-sunken" />
              ))}
            </div>
          ) : options.length === 0 ? (
            <p className="text-small text-ink-muted">
              {t("No categories yet --")}{" "}
              <Link href={`/categories?addType=${kind}`} onNavigate={onClose} className="font-semibold text-emerald hover:underline">
                {t("add one under Budget")}
              </Link>
              .
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {visible.map((option) => {
                const on = option.name === category;
                const tone = categoryTone(option.color);
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setCategory(option.name)}
                    className={cn("flex h-21 flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 transition-colors", on ? "border-[1.5px] border-emerald bg-mint-50" : "border border-line bg-surface hover:border-line-strong")}
                  >
                    <span className={cn("flex size-8 items-center justify-center rounded-full [&_svg]:size-4", tone.bg, tone.fg)}>{createElement(option.icon ? budgetCategoryIcon(option.icon) : LayoutGrid, { "aria-hidden": true })}</span>
                    <span className={cn("line-clamp-2 max-w-full text-center text-caption leading-4", on ? "font-semibold text-emerald" : "font-medium text-ink-2")}>{option.name}</span>
                  </button>
                );
              })}
              {!showAll && options.length > TILE_LIMIT + 1 && (
                <button type="button" onClick={() => setShowAll(true)} className="flex h-21 flex-col items-center justify-center gap-1 rounded-md border border-line bg-surface px-1 py-1.5 hover:border-line-strong">
                  <span className="flex size-8 items-center justify-center rounded-full bg-surface-sunken text-ink-2">
                    <LayoutGrid className="size-4" aria-hidden="true" />
                  </span>
                  <span className="text-caption font-medium text-ink-2">{t("More…")}</span>
                </button>
              )}
            </div>
          )}
          {!loading && kind === "EXPENSE" && expenseAccounts.length === 0 && <p className="mt-2 text-caption text-expense">{t("No expense account exists in this workspace yet -- add one in Chart of Accounts first.")}</p>}
        </fieldset>
      )}

      {wide && budgetRow && budgetLimit > 0 && (
        <div className="flex gap-3 rounded-md border border-warning/30 bg-warning-soft px-4 py-3 text-small leading-relaxed text-warning">
          <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
          <span>
            {category} {t("has")} <b className="font-semibold">{formatCurrency(budgetLeft, currency)}</b> {t("left this month.")} {t("After this,")} <b className="font-semibold">{formatCurrency(budgetLeft - value, currency)}</b> {t("of")} {formatCurrency(budgetLimit, currency)} {t("will be left.")}
          </span>
        </div>
      )}

      <WalletPicker
        label={t(kind === "INCOME" ? "Deposit to" : kind === "EXPENSE" ? "Pay from" : "From")}
        wallets={wallets}
        value={accountId}
        onChange={setAccountId}
        after={after}
        currency={currency}
        loading={loading}
        error={walletsError}
        onClose={onClose}
      />
      {isTransfer && <WalletPicker label={t("To")} wallets={wallets.filter((w) => w.id !== accountId)} value={toAccountId} onChange={setToAccountId} after={toAfter} currency={currency} loading={loading} error={null} onClose={onClose} />}

      <div className="grid gap-3 md:grid-cols-[170px_minmax(0,1fr)]">
        <Field htmlFor="txn-date" label={<span className="text-body font-medium text-ink">{t("Date")}</span>}>
          <Input id="txn-date" type="date" size="md" value={date} onChange={(event) => setDate(event.target.value)} leading={<CalendarDays />} max={getAppToday()} />
        </Field>
        <Field
          htmlFor="txn-note"
          label={
            <span className="text-body font-medium text-ink">
              {t("Note")} <span className="font-normal text-ink-muted">({t("optional")})</span>
            </span>
          }
        >
          <Input id="txn-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("Weekly groceries")} maxLength={200} />
        </Field>
      </div>
    </>
  );

  const footer = (
    <div className={cn("flex items-center gap-2 border-t border-line bg-surface", wide ? "px-6 py-4" : "flex-wrap px-4 pt-3 pb-6")}>
      <Button type="button" variant="secondary" onClick={() => save(true)} disabled={!valid || isPending} className={cn("px-3", !wide && "order-2 flex-1")}>
        {t("Save & add another")}
      </Button>
      <span className="hidden flex-1 md:block" />
      <Button type="button" variant="ghost" onClick={onClose} className="hidden px-3 md:inline-flex">
        {t("Cancel")}
      </Button>
      <Button type="submit" variant="action" disabled={!valid || isPending} className={cn("px-4", !wide && "order-1 w-full")}>
        {isPending && <Loader size={16} onDark label={t("Loading...")} />}
        {t(KIND_META[kind].save)}
        {wide && <Kbd className="rounded-[4px] border-0 bg-white/18 px-1 py-0 font-sans text-[11px] text-white">Enter</Kbd>}
      </Button>
    </div>
  );

  const form = (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save(false);
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-2")}>{body}</div>
      {footer}
    </form>
  );

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent
        side={wide ? "right" : "bottom"}
        showCloseButton={false}
        className={cn(
          "gap-0 border-0 bg-surface p-0 text-ink",
          wide ? "w-115 shadow-[-28px_0_60px_-16px_rgba(11,61,46,0.3)] sm:max-w-115" : "h-[92vh] rounded-t-xl shadow-[0_-20px_60px_-16px_rgba(11,61,46,0.35)]",
        )}
      >
        {!wide && <span aria-hidden="true" className="mt-2 block h-1.25 w-10 shrink-0 self-center rounded-full bg-chart-other" />}
        <SheetHeader className={cn("flex-row items-center justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-2 pb-1")}>
          <SheetTitle className={cn("text-ink", wide ? "text-h3" : "text-h3 font-bold")}>{t("New transaction")}</SheetTitle>
          <span className="flex items-center gap-2">
            {wide && <Kbd className="rounded-[4px] bg-cream font-sans text-caption font-semibold text-ink-muted">Esc</Kbd>}
            <button type="button" onClick={onClose} aria-label={t("Close")} className={cn("flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken", wide ? "size-9" : "size-11")}>
              <X className={wide ? "size-4.5" : "size-5"} aria-hidden="true" />
            </button>
          </span>
        </SheetHeader>
        {form}
      </SheetContent>
    </Sheet>
  );
}

interface WalletPickerProps {
  label: string;
  wallets: Account[];
  value: string;
  onChange: (id: string) => void;
  // The wallet's balance once this entry is saved.
  after: number | null;
  currency: string;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

// The wallet to pay from or into: its icon, name, balance now and after.
function WalletPicker({ label, wallets, value, onChange, after, currency, loading, error, onClose }: WalletPickerProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const selected = wallets.find((w) => w.id === value);
  const id = useId();

  return (
    <div className="flex flex-col gap-2">
      <label id={`${id}-label`} className="text-body font-medium text-ink">
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-labelledby={`${id}-label`}
            aria-haspopup="listbox"
            disabled={loading || wallets.length === 0}
            className="flex h-14 items-center gap-3 rounded-md border border-line-strong bg-surface px-4 text-left disabled:opacity-60 data-open:border-emerald data-open:shadow-[0_0_0_3px_rgba(31,122,90,0.18)]"
          >
            {selected ? (
              <>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-mint-50 text-emerald">{createElement(walletIcon(selected), { className: "size-4", "aria-hidden": true })}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="truncate text-body font-semibold text-ink">{selected.name}</span>
                  <span className="truncate text-caption font-normal text-ink-muted tabular-nums">
                    {t("Balance")} {formatCurrency(selected.currentBalance, currency)}
                    {after !== null && ` · ${formatCurrency(after, currency)} ${t("after this")}`}
                  </span>
                </span>
              </>
            ) : (
              <span className="flex-1 text-body text-ink-muted">{loading ? t("Loading...") : t("No wallet yet")}</span>
            )}
            <ChevronDown className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) gap-0 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
          <ul role="listbox" aria-labelledby={`${id}-label`} className="flex max-h-72 flex-col overflow-y-auto">
            {wallets.map((wallet) => {
              const on = wallet.id === value;
              return (
                <li key={wallet.id} role="option" aria-selected={on}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(wallet.id);
                      setOpen(false);
                    }}
                    className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-cream", on && "bg-mint-50")}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-mint-50 text-emerald">{createElement(walletIcon(wallet), { className: "size-4", "aria-hidden": true })}</span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-body font-semibold text-ink">{wallet.name}</span>
                      <span className="text-caption font-normal text-ink-muted tabular-nums">{formatCurrency(wallet.currentBalance, currency)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </PopoverContent>
      </Popover>
      {!loading && error && (
        <p role="alert" className="text-caption text-expense">
          {t(error)}
        </p>
      )}
      {!loading && !error && wallets.length === 0 && (
        <p className="text-caption text-ink-muted">
          {t("No wallet yet.")}{" "}
          <Link href="/balance/wallet" onNavigate={onClose} className="font-semibold text-emerald hover:underline">
            {t("Add a wallet")}
          </Link>
        </p>
      )}
    </div>
  );
}
