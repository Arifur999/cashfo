"use client";

import { ArrowDown, ArrowDownLeft, ArrowLeftRight, ArrowUp, ArrowUpRight, CalendarDays, Check, ChevronDown, Info, LayoutGrid, Lock, Plus, TriangleAlert, Undo2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createElement, useEffect, useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { KindCards } from "@/components/modules/Customer/IncomeExpense/IEDialog";
import { WalletPicker } from "@/components/modules/Customer/Shared/WalletPicker";
import Loader from "@/components/shared/Loader";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import Textarea from "@/components/smartly/form/Textarea";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAmountField } from "@/hooks/useAmountField";
import { CategoryListbox } from "./CategoryListbox";
import { DayTextField } from "./DayTextField";
import { NewCategoryForm } from "./NewCategoryForm";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { budgetTone } from "@/lib/budgetTone";
import type { Account, BudgetOverview } from "@/lib/customer/api";
import { getBudgetOverviewAction, listBudgetCategoryNamesAction, type BudgetCategoryName } from "@/lib/customer/budgetActions";
import { categoryIconFor } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { dayText, dayTextProblem, parseDayText } from "@/lib/customer/dayText";
import { correctTransactionAction, createExpenseAction, createIncomeAction, createTransferAction, listExpenseAccountsAction, listMoneyAccountsAction } from "@/lib/customer/quickEntryActions";
import { DELETED_REASON, transactionBackLink, transactionPageHref } from "@/lib/customer/transactionDisplay";
import { undoEditAction, voidTransactionAction } from "@/lib/customer/transactionActions";
import { categoryLabel, editChanges, type EditableEntry, relativeDayKey } from "@/lib/customer/transactionRows";
import { getAppToday } from "@/lib/date";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { plural } from "@/lib/i18n/message";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export type EntryKind = "INCOME" | "EXPENSE" | "TRANSFER";

// What a save posted, for the page that opened the popup (Transactions
// shows it and lights its row).
export interface SavedEntry {
  id: string;
  kind: EntryKind;
  // YYYY-MM-DD.
  day: string;
  category: string;
  accountId: string;
  note: string;
}

interface TransactionDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
  // Which kind is picked when the drawer opens; null picks none, as the
  // Income & Expense pages' popup starts (design: TxnDrawer).
  initialKind?: EntryKind | null;
  // The kinds the popup offers (all three unless a page says: the Income &
  // Expense pages offer income and expense).
  kinds?: EntryKind[];
  // A saved entry to edit (decision D2): no tabs, the entry's values filled
  // in, and saving voids it and posts the corrected one.
  editing?: EditableEntry | null;
  // An edit made from a list: stay on the list (refreshed) rather than open
  // the corrected entry's page.
  stayOnEdit?: boolean;
  // Told what each save posted.
  onSaved?: (saved: SavedEntry) => void;
}

const TILE_LIMIT = 7;
// The backend's cap on an entry's description (quick-entries DTOs).
const NOTE_MAX = 500;
const ALL_KINDS: EntryKind[] = ["INCOME", "EXPENSE", "TRANSFER"];

// The board's tab arrows: money coming in points down-left, money going out
// up-right. The picked tab's words take the kind's colour (selected).
const KIND_META: Record<EntryKind, { label: string; icon: React.ReactNode; selected: string; save: string; done: string; failed: string }> = {
  INCOME: { label: "Income", icon: <ArrowDownLeft className="text-income" strokeWidth={2.25} />, selected: "[&>button[aria-pressed=true]]:text-income", save: "Save income", done: "Income added", failed: "Failed to add income" },
  EXPENSE: { label: "Expense", icon: <ArrowUpRight className="text-expense-fill" strokeWidth={2.25} />, selected: "[&>button[aria-pressed=true]]:text-expense", save: "Save expense", done: "Expense added", failed: "Failed to add expense" },
  TRANSFER: { label: "Transfer", icon: <ArrowLeftRight className="text-info" />, selected: "[&>button[aria-pressed=true]]:text-info", save: "Move money", done: "Transfer completed", failed: "Failed to create transfer" },
};

// A category tile: 76px, the 10px radius, the category's icon on its own
// colour in a 32px square, the name on one line under it.
const TILE = "flex h-19 min-w-0 flex-col items-center justify-center gap-1.5 rounded-[10px] p-1.5 transition-colors";
const TILE_ICON = "flex size-8 items-center justify-center rounded-sm [&_svg]:size-4";
const TILE_NAME = "max-w-full truncate text-center text-caption";

// What an entry does to one wallet: income adds to the wallet it goes
// into, an expense takes from the one it is paid from, a transfer does both.
function walletEffect(walletId: string, kind: EntryKind, accountId: string, toAccountId: string, amount: number): number {
  if (kind === "INCOME") return walletId === accountId ? amount : 0;
  return (walletId === accountId ? -amount : 0) + (kind === "TRANSFER" && walletId === toAccountId ? amount : 0);
}

// The phone board leads with Expense.
const PHONE_ORDER: EntryKind[] = ["EXPENSE", "INCOME", "TRANSFER"];

// The desktop popup's kind cards: money in points up, money out down.
const WIDE_KINDS = [
  { value: "INCOME" as const, label: "Income", icon: <ArrowUp strokeWidth={2.25} />, tone: "income" as const },
  { value: "EXPENSE" as const, label: "Expense", icon: <ArrowDown strokeWidth={2.25} />, tone: "expense" as const },
  { value: "TRANSFER" as const, label: "Transfer", icon: <ArrowLeftRight strokeWidth={2.25} />, tone: "info" as const },
];

// A phone field's label: 13px semibold over its 52px box.
const PHONE_LABEL = "text-small font-semibold text-ink-2";
// A desktop field's label (the board's 14px medium).
const WIDE_LABEL = "text-body font-medium text-ink";
// The board's line under a field that needs fixing.
const FIELD_ERROR = "text-[12.5px] leading-normal text-expense";

// The month's budget hint, by how much of the limit this entry would use:
// a quiet note under 70%, amber to 90%, red past it.
const HINT_TONE = {
  income: { box: "border-line bg-strip text-ink-2", icon: <Info className="mt-px size-4 shrink-0 text-ink-muted" aria-hidden="true" />, figure: "text-ink" },
  warning: { box: "border-warning-fill/40 bg-warning-soft/60 text-warning", icon: <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />, figure: "text-warning" },
  expense: { box: "border-expense-line bg-expense-soft text-expense", icon: <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />, figure: "text-expense" },
} as const;

const NO_CATEGORIES: Record<"INCOME" | "EXPENSE", BudgetCategoryName[]> = { INCOME: [], EXPENSE: [] };
const NO_FAILURES = { wallets: false, expenseAccounts: false, INCOME: false, EXPENSE: false };

// Wide screens get the popup; read when the drawer opens, so a phone that
// opens it with no kind picked still starts on one (its board leads with
// Expense).
const isWideNow = () => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;

// New transaction: Income, Expense or Transfer in one drawer. On wide
// screens it is the board's popup (TxnDrawer): the type, the date and the
// account side by side, the amount, the category list and a description;
// Save says what is still missing under each field. On phones it comes up
// from the bottom as the phone board draws it: plain tabs, the amount large
// in the middle, the category tiles, the wallet and the day side by side.
// Enter saves; on a phone "Save & add another" keeps it open and clears the
// amount and note. A saved or edited entry's toast offers Undo.
export function TransactionDrawer({ open, onClose, businessId, currency, initialKind = "EXPENSE", kinds = ALL_KINDS, editing = null, stayOnEdit = false, onSaved }: TransactionDrawerProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const { user } = useAuth();
  const defaultAccountId = user.businesses.find((business) => business.id === businessId)?.defaultAccountId ?? null;
  const wide = useMediaQuery("(min-width: 768px)");
  const [kind, setKind] = useState<EntryKind | null>(initialKind);
  const [amount, setAmount] = useState("");
  const amountField = useAmountField(amount, setAmount, currency);
  const [category, setCategory] = useState("");
  const [showAll, setShowAll] = useState(false);
  // The phone's "Add new category" box under the tiles.
  const [addingCategory, setAddingCategory] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  // The day as typed in the popup's box (DD/MM/YYYY); the phone's own
  // picker writes it too.
  const [dateText, setDateText] = useState(() => dayText(getAppToday()));
  const [note, setNote] = useState("");
  const [wallets, setWallets] = useState<Account[]>([]);
  const [walletsError, setWalletsError] = useState<string | null>(null);
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState(NO_CATEGORIES);
  // Which reads failed: a failed one is never shown as "none yet".
  const [failed, setFailed] = useState(NO_FAILURES);
  const [budget, setBudget] = useState<BudgetOverview | null>(null);
  const [loading, setLoading] = useState(true);
  // Save was pressed with something missing: each field says what.
  const [showErrors, setShowErrors] = useState(false);
  // The category box was opened before a type was picked.
  const [kindNudge, setKindNudge] = useState(false);
  // Bumped by Try again, and by a save that changes the month's spending.
  const [attempt, setAttempt] = useState(0);
  const [budgetVersion, setBudgetVersion] = useState(0);
  const [isPending, startTransition] = useTransition();
  const amountId = useId();

  // The workspace this drawer adds to. A view-only member can open it from
  // anywhere the Add menu is, so it says so before the form, not after.
  const workspace = user.businesses.find((b) => b.id === businessId);
  const canAdd = workspace?.role !== "STAFF";
  const editingKind = editing?.kind;
  // An income or expense may become the other when edited (the board's
  // Type cards stay on); a transfer stays one.
  const offered: EntryKind[] = editing ? (editing.kind === "TRANSFER" ? ["TRANSFER"] : ["INCOME", "EXPENSE"]) : kinds;

  // Reset the instant the drawer transitions closed → open (React's
  // render-time pattern for "reset state when a prop changes"). It starts
  // as closed, so a drawer mounted open (a list's Edit) fills in too.
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setKind(editing?.kind ?? initialKind ?? (isWideNow() ? null : (PHONE_ORDER.find((option) => kinds.includes(option)) ?? "EXPENSE")));
      setAmount(editing ? String(editing.amount) : "");
      setCategory(editing?.category ?? "");
      setShowAll(false);
      setAccountId(editing?.accountId ?? "");
      setToAccountId(editing?.toAccountId ?? "");
      setDateText(dayText(editing?.day ?? getAppToday()));
      setNote(editing?.note ?? "");
      setLoading(true);
      setWalletsError(null);
      setFailed(NO_FAILURES);
      setShowErrors(false);
      setKindNudge(false);
    }
  }

  // The wallets, the expense accounts and both kinds of category. Reads
  // that land after the drawer closed (or after a newer try) are dropped.
  useEffect(() => {
    if (!open) return;
    let live = true;
    Promise.all([listMoneyAccountsAction(businessId), listExpenseAccountsAction(businessId), listBudgetCategoryNamesAction(businessId, "EXPENSE"), listBudgetCategoryNamesAction(businessId, "INCOME")])
      .then(([money, expense, expenseCategories, incomeCategories]) => {
        if (!live) return;
        const list = money.data ?? [];
        setWallets(list);
        setWalletsError(money.success ? null : (money.message ?? "Failed to load your wallets"));
        // The member's default wallet here (Settings › App preferences),
        // while it is still one of them. Without one, the Income & Expense
        // popup (opened with no kind) starts with none picked (design:
        // TxnDrawer); the Add menu's drawer and the phone sheet with the first.
        const preferred = list.find((wallet) => wallet.id === defaultAccountId)?.id;
        const startEmpty = initialKind === null && isWideNow();
        setAccountId((current) => current || preferred || (startEmpty ? "" : list[0]?.id) || "");
        // Only a transfer has a second wallet: an edit of an income or an
        // expense never gets one, so opening it changes nothing.
        if (editingKind === undefined || editingKind === "TRANSFER") setToAccountId((current) => current || list.find((wallet) => wallet.id !== (preferred ?? list[0]?.id))?.id || "");
        setExpenseAccounts(expense.data ?? []);
        setCategories({ EXPENSE: expenseCategories.data ?? [], INCOME: incomeCategories.data ?? [] });
        setFailed({ wallets: !money.success, expenseAccounts: !expense.success, EXPENSE: !expenseCategories.success, INCOME: !incomeCategories.success });
      })
      .catch(() => {
        // The action itself failed (offline, or a page left open across a
        // deploy): nothing was read.
        if (!live) return;
        setWalletsError("Failed to load your wallets");
        setFailed({ wallets: true, expenseAccounts: true, EXPENSE: true, INCOME: true });
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [open, businessId, editingKind, attempt, defaultAccountId, initialKind]);

  const date = parseDayText(dateText);
  const today = getAppToday();

  // The budget of the month the entry is dated in, for the "left this
  // month" hint: an entry for last month counts against last month.
  const entryMonth = date.slice(0, 7);
  useEffect(() => {
    if (!open || !entryMonth) return;
    let live = true;
    const [year, month] = entryMonth.split("-").map(Number);
    getBudgetOverviewAction(businessId, month, year)
      .then((overview) => live && setBudget(overview))
      .catch(() => live && setBudget(null));
    return () => {
      live = false;
    };
  }, [open, businessId, entryMonth, budgetVersion]);

  function retry() {
    setLoading(true);
    setFailed(NO_FAILURES);
    setWalletsError(null);
    setAttempt((value) => value + 1);
  }

  const isTransfer = kind === "TRANSFER";
  const categoryKind = kind === "INCOME" || kind === "EXPENSE" ? kind : null;
  const options = categoryKind ? categories[categoryKind] : [];
  const categoriesFailed = categoryKind !== null && failed[categoryKind];
  const loadFailed = failed.wallets || failed.expenseAccounts || failed.EXPENSE || failed.INCOME;
  const hiddenChoice = options.findIndex((option) => option.name === category) >= TILE_LIMIT;
  const visible = showAll || hiddenChoice || options.length <= TILE_LIMIT + 1 ? options : options.slice(0, TILE_LIMIT);
  const wallet = wallets.find((w) => w.id === accountId);
  const toWallet = wallets.find((w) => w.id === toAccountId);
  const value = Number(amount) || 0;
  // A wallet's balance once this is saved. An edit first takes the saved
  // entry back out, since the balance already holds it.
  const afterFor = (target: Account) =>
    Number(target.currentBalance) - (editing ? walletEffect(target.id, editing.kind, editing.accountId, editing.toAccountId, editing.amount) : 0) + (kind ? walletEffect(target.id, kind, accountId, toAccountId, value) : 0);
  const after = wallet ? afterFor(wallet) : null;
  const toAfter = toWallet ? afterFor(toWallet) : null;

  // The budget hint, against the month the entry is dated in. An edit's
  // original is still in that month's spending until the edit saves.
  const loadedMonth = budget ? `${budget.year}-${String(budget.month).padStart(2, "0")}` : null;
  const budgetRow = kind === "EXPENSE" && category && loadedMonth === entryMonth ? budget?.categories.find((c) => c.name === category) : undefined;
  const budgetLimit = budgetRow?.monthlyLimit ? Number(budgetRow.monthlyLimit) : 0;
  const editedOut = editing?.kind === "EXPENSE" && editing.category === category && editing.day.slice(0, 7) === entryMonth ? editing.amount : 0;
  const budgetSpent = budgetRow ? Number(budgetRow.spent) - editedOut : 0;
  const budgetLeft = budgetLimit - budgetSpent;
  const showBudget = !!budgetRow && budgetLimit > 0;
  const hint = HINT_TONE[budgetTone(budgetLimit > 0 ? ((budgetSpent + value) / budgetLimit) * 100 : 0)];

  // An expense posts against a real expense account; the budget category is
  // only its label. Best-effort match by name, else the first one.
  // An edit keeps the entry's own income or expense account while its
  // category stays the same.
  const keptAccountId = editing && category === editing.category ? editing.otherAccountId : undefined;
  const expenseAccountId = keptAccountId ?? expenseAccounts.find((a) => a.name.toLowerCase().includes(category.toLowerCase()))?.id ?? expenseAccounts[0]?.id ?? "";
  // How many of the entry's values an edit has changed.
  const changes = editing ? editChanges(editing, { amount: value, category, accountId, toAccountId, day: date, note }) + (kind !== null && kind !== editing.kind ? 1 : 0) : 0;
  // A category is needed whenever there are some to pick; when the read
  // failed it is still needed, so an outage can't save an untagged entry.
  // An entry saved without one may be edited and stay without.
  const keepsNoCategory = editing !== null && editing.category === "" && category === "";

  // What is still missing, each said under its field once Save is pressed
  // (the board's checks).
  const problems = {
    kind: kind === null,
    date: dayTextProblem(dateText),
    account: accountId.length === 0,
    toAccount: isTransfer && (toAccountId.length === 0 || toAccountId === accountId),
    amount: !(value >= 0.01),
    category: categoryKind !== null && (options.length > 0 ? category.length === 0 && !keepsNoCategory : categoriesFailed),
    // An expense has no expense account to post against (said under the category).
    expenseAccount: kind === "EXPENSE" && expenseAccountId.length === 0,
  };
  const complete = !problems.kind && !problems.date && !problems.account && !problems.toAccount && !problems.amount && !problems.category && !problems.expenseAccount;
  const valid = canAdd && complete && (!editing || changes > 0);
  // Undo of what a save just posted, from its toast.
  const undo = async (run: () => Promise<{ success: boolean; message?: string }>, done: string) => {
    const result = await run();
    if (result.success) {
      toast.success(t(done));
      router.refresh();
    } else {
      toast.error(t(result.message ?? "Couldn't undo the change"));
    }
  };
  // The phone's one thing still missing, said by its disabled button.
  const pickCategory = canAdd && categoryKind !== null && value > 0 && accountId.length > 0 && options.length > 0 && !category;
  const typeError = (showErrors || kindNudge) && problems.kind;

  function switchKind(next: EntryKind) {
    setKind(next);
    setCategory("");
    setShowAll(false);
    setAddingCategory(false);
    setKindNudge(false);
  }

  // A category added from the popup joins its kind's list and is picked.
  function categoryAdded(added: BudgetCategoryName) {
    if (!categoryKind) return;
    setCategories((current) => ({ ...current, [categoryKind]: [...current[categoryKind].filter((option) => option.id !== added.id), added] }));
    setCategory(added.name);
    setAddingCategory(false);
  }

  function save(another: boolean) {
    if (isPending || !canAdd) return;
    // Nothing changed: there is nothing to correct.
    if (editing && changes === 0 && complete) {
      onClose();
      return;
    }
    if (!complete || !kind) {
      setShowErrors(true);
      return;
    }
    const savedKind = kind;
    startTransition(async () => {
      // An edit keeps a loan profit's bank or person.
      const contactId = editing?.contactId ?? undefined;
      const income = { toAccountId: accountId, incomeAccountId: keptAccountId, amount: value, date, categoryId: category || undefined, note: note || undefined, contactId };
      const expense = { fromAccountId: accountId, expenseAccountId, amount: value, date, categoryId: category || undefined, note: note || undefined, contactId };
      const transfer = { fromAccountId: accountId, toAccountId, amount: value, date, description: note || undefined };
      const saved = (id: string): SavedEntry => ({ id, kind: savedKind, day: date, category, accountId, note: note.trim() });
      if (editing) {
        const corrected = await correctTransactionAction(businessId, editing.id, savedKind, savedKind === "INCOME" ? income : savedKind === "EXPENSE" ? expense : transfer);
        if (!corrected.success || !corrected.data) {
          toast.error(t(corrected.message ?? "Failed to save the changes"));
          return;
        }
        const correctedId = corrected.data.id;
        toast.success(t("Transaction updated"), { action: { label: t("Undo"), onClick: () => void undo(() => undoEditAction(businessId, correctedId), "Change undone") } });
        onClose();
        onSaved?.(saved(corrected.data.id));
        // From a list, the list shows the corrected entry in its place.
        if (stayOnEdit) {
          router.refresh();
          return;
        }
        // The entry on screen is now the voided original; open the new one,
        // keeping the way back to the page it was opened from.
        router.replace(transactionPageHref(corrected.data.id, transactionBackLink(new URLSearchParams(window.location.search).get("from"))));
        return;
      }
      const result = savedKind === "INCOME" ? await createIncomeAction(businessId, income) : savedKind === "EXPENSE" ? await createExpenseAction(businessId, expense) : await createTransferAction(businessId, transfer);
      if (!result.success) {
        toast.error(t(result.message ?? KIND_META[savedKind].failed));
        return;
      }
      // A transfer isn't on the Income & Expense list, and a new entry can
      // land on another page or outside the filters: say where it is.
      const created = result.data;
      toast.success(
        t(savedKind === "TRANSFER" ? KIND_META.TRANSFER.done : "Transaction saved"),
        created
          ? savedKind === "TRANSFER"
            ? { action: { label: t("View"), onClick: () => router.push("/balance/transfer") } }
            : { action: { label: t("Undo"), onClick: () => void undo(() => voidTransactionAction(businessId, created.id, DELETED_REASON), "Transaction removed") } }
          : undefined,
      );
      if (created) onSaved?.(saved(created.id));
      router.refresh();
      if (another) {
        setAmount("");
        setNote("");
        setShowErrors(false);
        // The next entry's balances and budget hint include this one.
        setBudgetVersion((version) => version + 1);
        const money = await listMoneyAccountsAction(businessId);
        if (money.success && money.data) setWallets(money.data);
        document.getElementById(amountId)?.focus();
      } else {
        onClose();
      }
    });
  }

  const fromLabel = kind === "INCOME" ? "Deposit to" : kind === "EXPENSE" ? "Pay from" : "From";
  // The phone's half-width label: income goes into the wallet, the rest leaves it.
  const phoneFromLabel = kind === "INCOME" ? "Into@@wallet" : "From";
  const dayWord = date ? relativeDayKey(date, today) : null;
  const errorLine = (on: boolean, text: string, id?: string) =>
    on && (
      <span id={id} role="alert" className={FIELD_ERROR}>
        {text}
      </span>
    );
  const dateError = showErrors && problems.date ? t(problems.date === "empty" ? "Pick a date." : problems.date === "missing" ? "That date does not exist." : "Write the date as DD/MM/YYYY.") : null;
  const atLeast = t("Enter an amount of at least {amount}.", { amount: `${currencySymbol(currency, fmt)} ${toLocaleDigits("0.01", fmt)}` });

  // The phone's day: a 52px box saying "Today" over the real date input,
  // which opens the phone's own picker.
  const phoneDate = (
    <Field htmlFor="txn-date" label={<span className={PHONE_LABEL}>{t("Date")}</span>}>
      <span className="relative flex h-13 items-center gap-3 rounded-md border border-line-strong bg-surface px-4 focus-within:border-emerald focus-within:shadow-[0_0_0_3px_rgba(31,122,90,0.18)]">
        <CalendarDays className="size-4.5 shrink-0 text-ink-2" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-body-lg text-ink">{dayWord ? t(dayWord) : date ? formatDate(`${date}T00:00:00.000Z`, "d MMM", fmt) : t("Pick a date.")}</span>
        <ChevronDown className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        <input id="txn-date" type="date" value={date} onChange={(event) => event.target.value && setDateText(dayText(event.target.value))} max={today} className="absolute inset-0 opacity-0" />
      </span>
    </Field>
  );

  const newCategory = (cancel: boolean) =>
    categoryKind && <NewCategoryForm businessId={businessId} kind={categoryKind} taken={options.map((option) => option.name)} onAdded={categoryAdded} onCancel={cancel ? () => setAddingCategory(false) : undefined} autoFocus={cancel} />;

  // The description box with its count of the 500 it holds.
  const noteCount = (
    <span className="block text-right tabular-nums">
      {toLocaleDigits(String(note.length), fmt)} / {toLocaleDigits(String(NOTE_MAX), fmt)}
    </span>
  );

  const expenseAccountMissing = !loading && kind === "EXPENSE" && !failed.expenseAccounts && expenseAccounts.length === 0 && (
    <p className="mt-2 text-caption text-expense">
      {workspace?.type === "BUSINESS"
        ? fillNodes(t("No expense account exists in this workspace yet. Add one under {link}."), {
            link: (
              <Link href="/accounts" onNavigate={onClose} className="font-semibold underline">
                {t("Books › Accounts")}
              </Link>
            ),
          })
        : t("No expense account exists in this workspace yet, so an expense can't be saved here.")}
    </p>
  );

  const banners = (
    <>
      {!canAdd && (
        <Banner tone="warning" inline icon={<Lock />}>
          {t("Only an owner or accountant can add transactions")}
        </Banner>
      )}
      {editing && !wide && (
        <Banner tone="info" inline icon={<Info />}>
          {t("You're editing a saved transaction. When you save, the original stays in History marked as corrected, and your balances update straight away.")}
        </Banner>
      )}
      {loadFailed && !loading && (
        <Banner tone="danger" inline icon={<TriangleAlert />}>
          <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <span>{t("Couldn't load your wallets and categories")}</span>
            <Button variant="secondary" size="sm" onClick={retry} className="pointer-coarse:h-11">
              {t("Try again")}
            </Button>
          </span>
        </Banner>
      )}
    </>
  );

  const wasLine = editing && value !== editing.amount && (
    <span className={cn("flex items-center gap-1.5 text-small font-semibold text-expense", !wide && "self-center")}>
      <Undo2 className="size-3.5" aria-hidden="true" />
      {t("Was {amount}", { amount: formatCurrency(editing.amount, currency, fmt) })}
    </span>
  );

  const dateField = (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor="txn-date" className={WIDE_LABEL}>
        {t("Date")}
      </label>
      <DayTextField id="txn-date" text={dateText} onTextChange={setDateText} invalid={!!dateError} describedBy={dateError ? "txn-date-error" : undefined} />
      {errorLine(!!dateError, dateError ?? "", "txn-date-error")}
      {!dateError && date > today && <span className="text-[12.5px] leading-normal text-warning">{t("This date is after today.")}</span>}
    </div>
  );

  // The desktop popup (design: TxnDrawer).
  const wideBody = (
    <>
      {banners}

      <div className="flex flex-col">
        <KindCards legend="Type" value={kind ?? ("" as EntryKind)} onChange={switchKind} options={WIDE_KINDS.filter((option) => offered.includes(option.value))} compact />
        {typeError && <span className={cn(FIELD_ERROR, "mt-1.5")}>{t("Choose Income or Expense.")}</span>}
      </div>

      {!isTransfer && (
        <div className="grid grid-cols-2 gap-3">
          {dateField}
          <div className="flex min-w-0 flex-col gap-1.5">
            <WalletPicker
              size="field"
              label={t("Account")}
              placeholder={t("Select an account")}
              wallets={wallets}
              value={accountId}
              onChange={setAccountId}
              after={after}
              currency={currency}
              loading={loading}
              error={walletsError}
              onClose={onClose}
              invalid={showErrors && problems.account}
            />
            {errorLine(showErrors && problems.account && wallets.length > 0, t("Choose an account."))}
          </div>
        </div>
      )}

      {isTransfer && (
        <>
          <WalletPicker label={t(fromLabel)} wallets={wallets} value={accountId} onChange={setAccountId} after={after} afterInWords currency={currency} loading={loading} error={walletsError} onClose={onClose} invalid={showErrors && problems.account} />
          <WalletPicker
            label={t("To@@wallet")}
            wallets={wallets.filter((w) => w.id !== accountId)}
            value={toAccountId}
            onChange={setToAccountId}
            after={toAfter}
            afterInWords
            currency={currency}
            loading={loading}
            error={null}
            onClose={onClose}
            invalid={showErrors && problems.toAccount}
          />
          <div className="grid grid-cols-2 gap-3">{dateField}</div>
        </>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={amountId} className={WIDE_LABEL}>
          {t("Amount ({symbol})", { symbol: currencySymbol(currency, fmt) })}
        </label>
        <div className={cn("flex h-13 items-center gap-2 rounded-field border bg-surface px-3.5 transition-[border-color,box-shadow] focus-within:border-focus-ring focus-within:focus-halo", showErrors && problems.amount ? "border-expense-fill" : "border-input")}>
          <span aria-hidden="true" className="text-[20px] font-semibold text-ink-soft">
            {currencySymbol(currency, fmt)}
          </span>
          <input
            id={amountId}
            type="text"
            inputMode="decimal"
            {...amountField}
            placeholder="0"
            autoFocus={kind !== null}
            aria-invalid={(showErrors && problems.amount) || undefined}
            className="min-w-0 flex-1 bg-transparent text-[20px] font-semibold text-ink tabular-nums outline-none placeholder:text-ink-faint"
          />
        </div>
        {errorLine(showErrors && problems.amount, atLeast)}
        {wasLine}
      </div>

      {!isTransfer && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="txn-cat" className={WIDE_LABEL}>
            {t("Category")}
          </label>
          {loading ? (
            <span className="block h-12 animate-pulse rounded-field bg-surface-sunken" />
          ) : categoriesFailed ? null : categoryKind !== null && options.length === 0 ? (
            canAdd ? (
              <div className="flex flex-col gap-2">
                <p className="text-small text-ink-muted">{t("No categories yet. Add the first one here.")}</p>
                {newCategory(false)}
              </div>
            ) : (
              <p className="text-small text-ink-muted">{t("No categories yet.")}</p>
            )
          ) : (
            <CategoryListbox
              // A new kind starts with its list closed.
              key={categoryKind ?? "none"}
              id="txn-cat"
              businessId={businessId}
              kind={categoryKind}
              options={options}
              value={category}
              onChange={setCategory}
              onAdded={categoryAdded}
              canAddCategory={canAdd}
              onNeedKind={() => setKindNudge(true)}
              invalid={showErrors && problems.category}
            />
          )}
          {errorLine(showErrors && problems.category && options.length > 0, t("Pick a category."))}
          {expenseAccountMissing}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="txn-note" className={WIDE_LABEL}>
          {t("Description")} <span className="font-normal text-ink-muted">{t("(optional)")}</span>
        </label>
        <Textarea id="txn-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("e.g. Weekly groceries from the local market")} maxLength={NOTE_MAX} className="max-h-65 min-h-19 resize-y leading-[1.45]" />
        <span className="text-caption text-ink-muted">{noteCount}</span>
      </div>
    </>
  );

  // The phone sheet (its own board): tabs, the big amount, tiles, then the
  // wallet and the day.
  const phoneBody = (
    <>
      {banners}
      {!editing && (
        <SegmentedControl
          options={PHONE_ORDER.filter((option) => offered.includes(option)).map((option) => ({ value: option, label: KIND_META[option].label }))}
          value={kind ?? ("" as EntryKind)}
          onChange={switchKind}
          label="Type"
          variant="pill"
          size="lg"
          stretch
          className={cn(
            "gap-1 [&_svg]:size-3.75 [&>button]:gap-1.5 [&>button]:text-body [&>button]:pointer-coarse:h-11 [&>button[aria-pressed=true]]:shadow-[0_1px_3px_rgba(18,32,29,0.12)]",
            kind && KIND_META[kind].selected,
          )}
        />
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-center gap-2 rounded-md py-2">
          <span aria-hidden="true" className={cn("text-h1 font-semibold", kind === "INCOME" ? "text-income" : kind === "EXPENSE" ? "text-expense-fill" : "text-ink-muted")}>
            {kind === "INCOME" ? "+" : kind === "EXPENSE" ? "−" : "↔"}
          </span>
          <span className="text-h1 font-semibold text-ink-2">{currencySymbol(currency, fmt)}</span>
          <input
            id={amountId}
            type="text"
            inputMode="decimal"
            {...amountField}
            placeholder="0"
            autoFocus
            aria-label={t("Amount")}
            style={{ width: `${Math.max(1, amountField.value.length)}ch` }}
            className="box-content min-w-0 bg-transparent text-display-xl leading-[normal] font-bold text-ink tabular-nums caret-emerald outline-none placeholder:text-ink-faint"
          />
        </div>
        {showBudget && (
          <span className="self-center text-small text-ink-muted">
            {fillNodes(t("{category}: {amount} left after this"), { category: categoryLabel(category, t), amount: <b className={hint.figure}>{formatCurrency(budgetLeft - value, currency, fmt)}</b> })}
          </span>
        )}
        {wasLine}
      </div>

      {categoryKind && (
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="sr-only">{t("Category")}</legend>
          {loading ? (
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }, (_, i) => (
                <span key={i} className="h-19 animate-pulse rounded-[10px] bg-surface-sunken" />
              ))}
            </div>
          ) : categoriesFailed ? null : options.length === 0 ? (
            canAdd ? (
              <div className="flex flex-col gap-2">
                <p className="text-small text-ink-muted">{t("No categories yet. Add the first one here.")}</p>
                {newCategory(false)}
              </div>
            ) : (
              <p className="text-small text-ink-muted">{t("No categories yet.")}</p>
            )
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
                    title={categoryLabel(option.name, t)}
                    className={cn(TILE, on ? "border-[1.5px] border-emerald bg-emerald-soft" : "border border-line bg-surface hover:border-input")}
                  >
                    <span className={cn(TILE_ICON, tone.bg, tone.fg)}>{createElement(categoryIconFor(option), { "aria-hidden": true })}</span>
                    {/* One line, cut with an ellipsis as the board does; the
                        caption's own line height, as a fixed 16px clipped
                        Bangla's lower vowel signs. */}
                    <span className={cn(TILE_NAME, on ? "font-semibold text-emerald" : "font-medium text-ink-2")}>{categoryLabel(option.name, t)}</span>
                  </button>
                );
              })}
              {!showAll && options.length > TILE_LIMIT + 1 && (
                <button type="button" onClick={() => setShowAll(true)} className={cn(TILE, "border border-line bg-surface hover:border-input")}>
                  <span className={cn(TILE_ICON, "bg-surface-sunken text-ink-soft")}>
                    <LayoutGrid aria-hidden="true" />
                  </span>
                  <span className={cn(TILE_NAME, "font-medium text-ink-2")}>{t("More…")}</span>
                </button>
              )}
            </div>
          )}
          {/* The phone adds a category under its tiles. */}
          {!loading && !categoriesFailed && options.length > 0 && canAdd && (
            <div className="mt-2">
              {addingCategory ? (
                newCategory(true)
              ) : (
                <button type="button" onClick={() => setAddingCategory(true)} className="flex min-h-11 items-center gap-1.5 rounded-md text-small font-semibold text-emerald hover:underline">
                  <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
                  {t("Add new category")}
                </button>
              )}
            </div>
          )}
          {expenseAccountMissing}
        </fieldset>
      )}

      <div className="grid grid-cols-2 gap-3">
        <WalletPicker size="compact" label={t(phoneFromLabel)} wallets={wallets} value={accountId} onChange={setAccountId} after={after} currency={currency} loading={loading} error={walletsError} onClose={onClose} />
        {isTransfer ? <WalletPicker size="compact" label={t("To@@wallet")} wallets={wallets.filter((w) => w.id !== accountId)} value={toAccountId} onChange={setToAccountId} after={toAfter} currency={currency} loading={loading} error={null} onClose={onClose} /> : phoneDate}
      </div>
      {isTransfer && phoneDate}
      <Field htmlFor="txn-note" label={<span className={PHONE_LABEL}>{t("Description")}</span>}>
        <Input id="txn-note" size="xl" value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("Weekly groceries")} maxLength={NOTE_MAX} />
      </Field>
    </>
  );

  const missing = pickCategory && <p className="text-caption text-ink-muted">{t("Pick a category to save")}</p>;
  const spinner = isPending && <Loader size={16} onDark label={t("Loading...")} />;

  // The board's foot: Cancel and Save on the right.
  const wideFooter = (
    <div className="flex items-center justify-end gap-2.5 border-t border-line px-6 py-4">
      <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={isPending} className="px-4.5">
        {t("Cancel")}
      </Button>
      <Button type="submit" size="lg" disabled={isPending || !canAdd} className="px-5">
        {spinner}
        {editing ? t("Save changes") : t(isTransfer ? KIND_META.TRANSFER.save : "Save transaction")}
      </Button>
    </div>
  );

  const phoneFooter = (
    <div className="flex flex-col gap-2 border-t border-line bg-surface px-4 pt-3 pb-8">
      {editing ? (
        <div className="flex items-center gap-2">
          <span className="flex-1 text-small text-ink-muted">{plural(t, changes, "{count} change", "{count} changes", undefined, fmt)}</span>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending} className="px-2.5">
            {t("Cancel")}
          </Button>
          <Button type="submit" variant="action" disabled={!valid || isPending} className="px-3.5">
            {isPending ? <Loader size={16} onDark label={t("Loading...")} /> : <Check strokeWidth={2.5} />}
            {t("Save changes")}
          </Button>
        </div>
      ) : (
        <>
          {missing}
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" size="xl" onClick={() => save(true)} disabled={!valid || isPending} className="h-13 flex-1 px-3">
              {t("Save & add another")}
            </Button>
            <Button type="submit" size="xl" disabled={!valid || isPending} className="h-13 flex-1 px-4">
              {isPending ? <Loader size={16} onDark label={t("Loading...")} /> : <Check strokeWidth={2.5} />}
              {t("Save")}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  const form = (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save(false);
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div data-txn-body="" className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto", wide ? "gap-4 px-6 py-4.5" : "gap-4 px-4 py-2")}>
        {wide ? wideBody : phoneBody}
      </div>
      {wide ? wideFooter : phoneFooter}
    </form>
  );

  // Wide screens: the board's popup in the middle of the screen (TxnDrawer).
  if (wide) {
    return (
      <Dialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
        <DialogContent
          showCloseButton={false}
          // The popup itself takes focus (no ring on a field, as the board
          // opens); Tab goes on to the first kind card.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement | null)?.focus();
          }}
          className="flex max-h-[calc(100dvh-48px)] w-135 flex-col gap-0 overflow-hidden rounded-[20px] border-0 bg-surface p-0 text-ink shadow-overlay ring-0 sm:max-w-[calc(100vw-48px)]">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line py-4 pr-4 pl-6">
            <DialogTitle className="text-[18px] font-semibold text-ink">{t(editing ? "Edit transaction" : "New transaction")}</DialogTitle>
            <DialogDescription className="sr-only">{editing ? `${editing.title} · ${formatDate(`${editing.day}T00:00:00.000Z`, "EEE, d MMM", fmt)}` : t("New transaction")}</DialogDescription>
            <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken">
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>
          {form}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent side="bottom" showCloseButton={false} className="gap-0 rounded-t-xl border-0 bg-surface p-0 text-ink shadow-[0_-20px_60px_-16px_rgba(11,61,46,0.35)] data-[side=bottom]:h-[90vh]">
        <span aria-hidden="true" className="mt-2 block h-1.25 w-10 shrink-0 self-center rounded-full bg-line-strong" />
        <SheetHeader className="flex-row items-center justify-between gap-3 space-y-0 px-4 pt-2 pb-1">
          {editing ? (
            <span className="flex min-w-0 flex-col gap-1">
              <SheetTitle className="text-h3 text-ink">{t("Edit transaction")}</SheetTitle>
              <span className="truncate text-small text-ink-muted">
                {editing.title} · {formatDate(`${editing.day}T00:00:00.000Z`, "EEE, d MMM", fmt)}
              </span>
            </span>
          ) : (
            <SheetTitle className="text-h3 font-bold text-ink">{t("New transaction")}</SheetTitle>
          )}
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken">
            <X className="size-5" aria-hidden="true" />
          </button>
        </SheetHeader>
        {form}
      </SheetContent>
    </Sheet>
  );
}
