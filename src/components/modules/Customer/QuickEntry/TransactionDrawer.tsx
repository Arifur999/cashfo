"use client";

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarDays, Check, ChevronDown, Info, LayoutGrid, TriangleAlert, Undo2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createElement, useEffect, useId, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import Kbd from "@/components/smartly/Kbd";
import { WalletPicker } from "@/components/modules/Customer/Shared/WalletPicker";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAmountField } from "@/hooks/useAmountField";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Account, BudgetOverview } from "@/lib/customer/api";
import { getBudgetCategoryNamesAction, getBudgetOverviewAction, type BudgetCategoryName } from "@/lib/customer/budgetActions";
import { categoryIconFor } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { appYearMonth } from "@/lib/customer/dateRangePresets";
import { correctTransactionAction, createExpenseAction, createIncomeAction, createTransferAction, getExpenseAccountsAction, listMoneyAccountsAction } from "@/lib/customer/quickEntryActions";
import { type EditableEntry, relativeDayKey } from "@/lib/customer/transactionRows";
import { getAppToday } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { banglaShortDay } from "@/lib/i18n/banglaDates";
import { plural } from "@/lib/i18n/message";
import { cn } from "@/lib/utils";
import DayInput from "@/components/smartly/form/DayInput";

export type EntryKind = "INCOME" | "EXPENSE" | "TRANSFER";

interface TransactionDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
  // Which tab is open when the drawer opens.
  initialKind?: EntryKind;
  // A saved entry to edit (decision D2): no tabs, the entry's values filled
  // in, and saving voids it and posts the corrected one.
  editing?: EditableEntry | null;
}

const TILE_LIMIT = 7;

const KIND_META: Record<EntryKind, { label: string; icon: React.ReactNode; active: string; save: string; done: string; failed: string }> = {
  INCOME: { label: "Income", icon: <ArrowUpRight className="text-income" strokeWidth={2.25} />, active: "text-income", save: "Save income", done: "Income added", failed: "Failed to add income" },
  EXPENSE: { label: "Expense", icon: <ArrowDownLeft className="text-expense" strokeWidth={2.25} />, active: "text-expense", save: "Save expense", done: "Expense added", failed: "Failed to add expense" },
  TRANSFER: { label: "Transfer", icon: <ArrowLeftRight className="text-info" />, active: "text-ink", save: "Move money", done: "Transfer completed", failed: "Failed to create transfer" },
};

// What an entry does to one wallet: income adds to the wallet it goes
// into, an expense takes from the one it is paid from, a transfer does both.
function walletEffect(walletId: string, kind: EntryKind, accountId: string, toAccountId: string, amount: number): number {
  if (kind === "INCOME") return walletId === accountId ? amount : 0;
  return (walletId === accountId ? -amount : 0) + (kind === "TRANSFER" && walletId === toAccountId ? amount : 0);
}

// The desktop board leads with Income; the phone board with Expense.
const KIND_ORDER: Record<"wide" | "phone", EntryKind[]> = { wide: ["INCOME", "EXPENSE", "TRANSFER"], phone: ["EXPENSE", "INCOME", "TRANSFER"] };

// A phone field's label: 13px semibold over its 52px box.
const PHONE_LABEL = "text-small font-semibold text-ink-2";

// New transaction: Income, Expense or Transfer in one drawer -- the amount
// first, the category tiles, the wallet with what it will hold after this,
// the date and a note. On phones it comes up from the bottom as the phone
// board draws it: plain tabs, the amount large in the middle, the wallet and
// the day side by side. Enter saves; "Save & add another" keeps it open and
// clears the amount and note.
export function TransactionDrawer({ open, onClose, businessId, currency, initialKind = "EXPENSE", editing = null }: TransactionDrawerProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const [kind, setKind] = useState<EntryKind>(initialKind);
  const [amount, setAmount] = useState("");
  const amountField = useAmountField(amount, setAmount, currency);
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
      setKind(editing?.kind ?? initialKind);
      setAmount(editing ? String(editing.amount) : "");
      setCategory(editing?.category ?? "");
      setShowAll(false);
      setAccountId(editing?.accountId ?? "");
      setToAccountId(editing?.toAccountId ?? "");
      setDate(editing?.day ?? getAppToday());
      setNote(editing?.note ?? "");
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
  const hiddenChoice = options.findIndex((option) => option.name === category) >= TILE_LIMIT;
  const visible = showAll || hiddenChoice || options.length <= TILE_LIMIT + 1 ? options : options.slice(0, TILE_LIMIT);
  const wallet = wallets.find((w) => w.id === accountId);
  const toWallet = wallets.find((w) => w.id === toAccountId);
  const value = Number(amount) || 0;
  // A wallet's balance once this is saved. An edit first takes the saved
  // entry back out, since the balance already holds it.
  const afterFor = (target: Account) =>
    Number(target.currentBalance) - (editing ? walletEffect(target.id, editing.kind, editing.accountId, editing.toAccountId, editing.amount) : 0) + walletEffect(target.id, kind, accountId, toAccountId, value);
  const after = wallet ? afterFor(wallet) : null;
  const toAfter = toWallet ? afterFor(toWallet) : null;
  const budgetRow = kind === "EXPENSE" && category ? budget?.categories.find((c) => c.name === category) : undefined;
  const budgetLimit = budgetRow?.monthlyLimit ? Number(budgetRow.monthlyLimit) : 0;
  const budgetLeft = budgetRow ? budgetLimit - Number(budgetRow.spent) : 0;
  // An expense posts against a real expense account; the budget category is
  // only its label. Best-effort match by name, else the first one.
  // An edit keeps the entry's own income or expense account while its
  // category stays the same.
  const keptAccountId = editing && category === editing.category ? editing.otherAccountId : undefined;
  const expenseAccountId = keptAccountId ?? expenseAccounts.find((a) => a.name.toLowerCase().includes(category.toLowerCase()))?.id ?? expenseAccounts[0]?.id ?? "";
  // How many of the entry's values an edit has changed.
  const changes = editing
    ? [value !== editing.amount, category !== editing.category, accountId !== editing.accountId, toAccountId !== editing.toAccountId, date !== editing.day, note.trim() !== editing.note.trim()].filter(Boolean).length
    : 0;
  const valid =
    value > 0 &&
    accountId.length > 0 &&
    (isTransfer ? toAccountId.length > 0 && toAccountId !== accountId : (options.length === 0 || category.length > 0) && (kind === "INCOME" || expenseAccountId.length > 0)) &&
    (!editing || changes > 0);

  function switchKind(next: EntryKind) {
    setKind(next);
    setCategory("");
    setShowAll(false);
  }

  function save(another: boolean) {
    if (!valid || isPending) return;
    startTransition(async () => {
      // An edit keeps a loan profit's bank or person.
      const contactId = editing?.contactId ?? undefined;
      const income = { toAccountId: accountId, incomeAccountId: keptAccountId, amount: value, date, categoryId: category || undefined, note: note || undefined, contactId };
      const expense = { fromAccountId: accountId, expenseAccountId, amount: value, date, categoryId: category || undefined, note: note || undefined, contactId };
      const transfer = { fromAccountId: accountId, toAccountId, amount: value, date, description: note || undefined };
      if (editing) {
        const corrected = await correctTransactionAction(businessId, editing.id, kind, kind === "INCOME" ? income : kind === "EXPENSE" ? expense : transfer);
        if (!corrected.success || !corrected.data) {
          toast.error(corrected.message ?? t("Failed to save the changes"));
          return;
        }
        toast.success(t("Changes saved"));
        onClose();
        // The entry on screen is now the voided original; open the new one.
        router.replace(`/transactions/${corrected.data.id}`);
        return;
      }
      const result = kind === "INCOME" ? await createIncomeAction(businessId, income) : kind === "EXPENSE" ? await createExpenseAction(businessId, expense) : await createTransferAction(businessId, transfer);
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

  const fromLabel = kind === "INCOME" ? "Deposit to" : kind === "EXPENSE" ? "Pay from" : "From";
  const dayWord = relativeDayKey(date, getAppToday());

  // The phone's day: a 52px box saying "Today" over the real date input,
  // which opens the phone's own picker.
  const phoneDate = (
    <Field htmlFor="txn-date" label={<span className={PHONE_LABEL}>{t("Date")}</span>}>
      <span className="relative flex h-13 items-center gap-3 rounded-md border border-line-strong bg-surface px-4 focus-within:border-emerald focus-within:shadow-[0_0_0_3px_rgba(31,122,90,0.18)]">
        <CalendarDays className="size-4.5 shrink-0 text-ink-2" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-body-lg text-ink">{dayWord ? t(dayWord) : formatDate(`${date}T00:00:00.000Z`, "d MMM")}</span>
        <ChevronDown className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        <input id="txn-date" type="date" value={date} onChange={(event) => event.target.value && setDate(event.target.value)} max={getAppToday()} className="absolute inset-0 opacity-0" />
      </span>
    </Field>
  );

  const body = (
    <>
      {editing ? (
        <Banner tone="info" inline icon={<Info />}>
          {t("You're editing a saved transaction. When you save, the original stays in History marked as corrected, and your balances update straight away.")}
        </Banner>
      ) : (
        <div className={cn("grid grid-cols-3 rounded-md bg-surface-sunken", wide ? "gap-1 p-1" : "gap-0.5 p-0.75")}>
          {KIND_ORDER[wide ? "wide" : "phone"].map((option) => {
            const on = option === kind;
            return (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => switchKind(option)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-sm transition-colors [&_svg]:size-[15px]",
                  wide ? "h-9 text-body" : "h-9.5 text-small",
                  on ? cn("bg-surface font-semibold shadow-card", wide ? KIND_META[option].active : "text-ink") : "font-medium text-ink-2 hover:text-ink",
                )}
              >
                {wide && KIND_META[option].icon}
                {t(KIND_META[option].label)}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor={amountId} className="text-body font-medium text-ink md:block hidden">
          {t("Amount")}
        </label>
        <div
          className={cn(
            "flex items-center rounded-md",
            wide ? "h-16 gap-3 border border-line-strong bg-surface px-4 focus-within:border-emerald focus-within:shadow-[0_0_0_3px_rgba(31,122,90,0.18)]" : "justify-center gap-2 py-2",
          )}
        >
          <span className={cn("text-h1 font-semibold", kind === "INCOME" ? "text-income" : kind === "EXPENSE" ? "text-expense" : "text-ink-muted")}>{kind === "INCOME" ? "+" : kind === "EXPENSE" ? "−" : "↔"}</span>
          <span className="text-h1 font-semibold text-ink-2">{currencySymbol(currency)}</span>
          <input
            id={amountId}
            type="text"
            inputMode="decimal"
            {...amountField}
            placeholder="0"
            autoFocus
            aria-label={t("Amount")}
            style={wide ? undefined : { width: `${Math.max(1, amountField.value.length)}ch` }}
            className={cn("min-w-0 bg-transparent font-bold text-ink tabular-nums outline-none placeholder:text-ink-faint", wide ? "flex-1 text-h1 tracking-[-0.02em]" : "box-content text-display-xl leading-[normal] caret-emerald")}
          />
        </div>
        {!wide && budgetRow && (
          <span className="self-center text-small text-ink-muted">
            {category} {t("has")} <b className="text-ink">{formatCurrency(budgetLeft - value, currency)}</b> {t("left after this")}
          </span>
        )}
        {editing && value !== editing.amount && (
          <span className={cn("flex items-center gap-1.5 text-small font-semibold text-expense", !wide && "self-center")}>
            <Undo2 className="size-3.5" aria-hidden="true" />
            {t("Was {amount}", { amount: formatCurrency(editing.amount, currency) })}
          </span>
        )}
      </div>

      {!isTransfer && (
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className={cn("text-body font-medium text-ink", wide ? "mb-2" : "sr-only")}>{t("Category")}</legend>
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
                    <span className={cn("flex size-8 items-center justify-center rounded-full [&_svg]:size-4", tone.bg, tone.fg)}>{createElement(categoryIconFor(option), { "aria-hidden": true })}</span>
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

      {wide ? (
        <>
          <WalletPicker label={t(fromLabel)} wallets={wallets} value={accountId} onChange={setAccountId} after={after} afterInWords currency={currency} loading={loading} error={walletsError} onClose={onClose} />
          {isTransfer && <WalletPicker label={t("To@@wallet")} wallets={wallets.filter((w) => w.id !== accountId)} value={toAccountId} onChange={setToAccountId} after={toAfter} afterInWords currency={currency} loading={loading} error={null} onClose={onClose} />}
          <div className="grid grid-cols-[170px_minmax(0,1fr)] gap-3">
            <Field htmlFor="txn-date" label={<span className="text-body font-medium text-ink">{t("Date")}</span>}>
              <DayInput id="txn-date" size="md" value={date} onChange={setDate} max={getAppToday()} />
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
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <WalletPicker size="compact" label={t("From")} wallets={wallets} value={accountId} onChange={setAccountId} after={after} currency={currency} loading={loading} error={walletsError} onClose={onClose} />
            {isTransfer ? <WalletPicker size="compact" label={t("To@@wallet")} wallets={wallets.filter((w) => w.id !== accountId)} value={toAccountId} onChange={setToAccountId} after={toAfter} currency={currency} loading={loading} error={null} onClose={onClose} /> : phoneDate}
          </div>
          {isTransfer && phoneDate}
          <Field htmlFor="txn-note" label={<span className={PHONE_LABEL}>{t("Note")}</span>}>
            <Input id="txn-note" size="xl" value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("Weekly groceries")} maxLength={200} />
          </Field>
        </>
      )}
    </>
  );

  const footer = editing ? (
    <div className={cn("flex items-center gap-3 border-t border-line bg-surface", wide ? "px-6 py-4" : "px-4 pt-3 pb-8")}>
      <span className="flex-1 text-small text-ink-muted">{plural(t, changes, "{count} change", "{count} changes")}</span>
      <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
        {t("Cancel")}
      </Button>
      <Button type="submit" disabled={!valid || isPending} className="px-4">
        {isPending ? <Loader size={16} onDark label={t("Loading...")} /> : <Check strokeWidth={2.5} />}
        {t("Save changes")}
      </Button>
    </div>
  ) : (
    <div className={cn("flex items-center border-t border-line bg-surface", wide ? "gap-2 px-6 py-4" : "gap-3 px-4 pt-3 pb-8")}>
      <Button type="button" variant="secondary" size={wide ? "md" : "xl"} onClick={() => save(true)} disabled={!valid || isPending} className={cn("px-3", !wide && "h-13 flex-1")}>
        {t("Save & add another")}
      </Button>
      <span className="hidden flex-1 md:block" />
      <Button type="button" variant="ghost" onClick={onClose} className="hidden px-3 md:inline-flex">
        {t("Cancel")}
      </Button>
      <Button type="submit" variant={wide ? "action" : "primary"} size={wide ? "md" : "xl"} disabled={!valid || isPending} className={cn("px-4", !wide && "h-13 flex-1")}>
        {isPending ? <Loader size={16} onDark label={t("Loading...")} /> : !wide && <Check strokeWidth={2.5} />}
        {wide ? t(KIND_META[kind].save) : t("Save")}
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
          wide ? "w-115 shadow-[-28px_0_60px_-16px_rgba(11,61,46,0.3)] data-[side=right]:sm:max-w-115" : "rounded-t-xl shadow-[0_-20px_60px_-16px_rgba(11,61,46,0.35)] data-[side=bottom]:h-[90vh]",
        )}
      >
        {!wide && <span aria-hidden="true" className="mt-2 block h-1.25 w-10 shrink-0 self-center rounded-full bg-chart-other" />}
        <SheetHeader className={cn("flex-row items-center justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-2 pb-1")}>
          {editing ? (
            <span className="flex min-w-0 flex-col gap-1">
              <SheetTitle className="text-h3 text-ink">{t("Edit transaction")}</SheetTitle>
              <span className="truncate text-small leading-[normal] text-ink-muted">
                {editing.title} · {locale === "bn" ? banglaShortDay(editing.day) : formatDate(`${editing.day}T00:00:00.000Z`, "EEE, d MMM")}
              </span>
            </span>
          ) : (
            <SheetTitle className={cn("text-ink", wide ? "text-h3" : "text-h3 font-bold")}>{t("New transaction")}</SheetTitle>
          )}
          <span className="flex items-center gap-2">
            {wide && !editing && <Kbd className="rounded-[4px] bg-cream font-sans text-caption font-semibold text-ink-muted">Esc</Kbd>}
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
