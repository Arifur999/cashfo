"use client";

import { ArrowRight, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useOnline } from "@/components/modules/Customer/Layout/useOnline";
import AmountInput from "@/components/modules/Customer/Shared/AmountInput";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import { WalletPicker } from "@/components/modules/Customer/Shared/WalletPicker";
import Loader from "@/components/shared/Loader";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Account } from "@/lib/customer/api";
import { BUILT_IN_CHARGE_CATEGORIES, chargeOf, defaultChargeCategory } from "@/lib/customer/balanceDisplay";
import { listBudgetCategoryNamesAction } from "@/lib/customer/budgetActions";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { correctTransactionAction, createTransferAction, listMoneyAccountsAction } from "@/lib/customer/quickEntryActions";
import { transferPair, type TransferPair } from "@/lib/customer/transfers";
import { getAppToday } from "@/lib/date";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export interface EditedTransfer {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  date: string;
  note: string;
  charge: number;
  chargeCategory: string | null;
}

interface TransferDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
  // Edit: the transfer to correct (voided and posted again, with its charge).
  editing?: EditedTransfer | null;
  // A new transfer out of this account (Accounts' "Transfer from here").
  fromId?: string | null;
}

// New or edit transfer (board: Transfers — New transfer popup): the day,
// from which account to which, how much and its charge (in taka or as a
// percent), the expense category the charge is filed under, a note, and
// both accounts before and after. A transfer the sender can't cover isn't
// saved.
export function TransferDialog({ open, onClose, businessId, currency, editing = null, fromId: presetFrom = null }: TransferDialogProps) {
  const { t, locale, fmt } = useLocale();
  const router = useRouter();
  const online = useOnline();
  const [pair, setPair] = useState<TransferPair>({ fromId: "", toId: "" });
  const [date, setDate] = useState(getAppToday());
  const [amount, setAmount] = useState("");
  const [charge, setCharge] = useState("");
  const [chargeMode, setChargeMode] = useState<"tk" | "pct">("tk");
  const [category, setCategory] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [wallets, setWallets] = useState<Account[]>([]);
  const [walletsError, setWalletsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setDate(editing?.date ?? getAppToday());
      setAmount(editing ? String(editing.amount) : "");
      setCharge(editing?.charge ? String(editing.charge) : "");
      setChargeMode("tk");
      // An edit keeps the category its charge was filed under; a new one
      // follows the sending account until one is picked.
      setCategory(editing?.chargeCategory ?? null);
      setNote(editing?.note ?? "");
      setError("");
      setLoading(true);
      if (editing) setPair({ fromId: editing.fromId, toId: editing.toId });
      else if (presetFrom) setPair((previous) => ({ fromId: presetFrom, toId: previous.toId === presetFrom ? "" : previous.toId }));
    }
  }

  useEffect(() => {
    if (!open) return;
    let live = true;
    listBudgetCategoryNamesAction(businessId, "EXPENSE")
      .then((result) => live && result.success && setCategories((result.data ?? []).map((row) => row.name)))
      .catch(() => undefined);
    listMoneyAccountsAction(businessId)
      .then((result) => {
        if (!live) return;
        const list = result.data ?? [];
        setWallets(list);
        setWalletsError(result.success ? null : (result.message ?? "Failed to load your wallets"));
        if (!editing) setPair((previous) => transferPair(list.map((wallet) => wallet.id), previous));
        setLoading(false);
      })
      .catch(() => {
        if (!live) return;
        setWalletsError("Failed to load your wallets");
        setLoading(false);
      });
    return () => {
      live = false;
    };
    // editing and the preset only seed the popup when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, businessId]);

  const lang = displayLanguage(locale);
  const nameOf = (wallet: Account) => accountDisplayName(wallet, lang);
  const from = wallets.find((wallet) => wallet.id === pair.fromId);
  const to = wallets.find((wallet) => wallet.id === pair.toId);
  const value = Number(amount) || 0;
  const fee = chargeOf(value, charge, chargeMode);
  const chargedCategory = category ?? defaultChargeCategory(from?.accountSubtype);
  const categoryOptions = [...BUILT_IN_CHARGE_CATEGORIES, ...categories.filter((name) => !BUILT_IN_CHARGE_CATEGORIES.includes(name))];
  if (category && !categoryOptions.includes(category)) categoryOptions.push(category);
  // Editing: the transfer being corrected gives its money back first, to
  // whichever side its accounts are on now.
  const giveBack = (wallet: Account | undefined) =>
    !editing || !wallet ? 0 : wallet.id === editing.fromId ? editing.amount + editing.charge : wallet.id === editing.toId ? -editing.amount : 0;
  const fromBefore = from ? Number(from.currentBalance) + giveBack(from) : 0;
  const toBefore = to ? Number(to.currentBalance) + giveBack(to) : 0;
  const fromAfter = fromBefore - value - fee;
  const same = !!from && !!to && from.id === to.id;
  const short = !!from && !!to && !same && value > 0 && fromAfter < 0;
  const pctTooHigh = chargeMode === "pct" && (Number(charge) || 0) > 100;
  // An edit whose account has been archived since can't pick it again.
  const archivedWallet = !!editing && !loading && !walletsError && (!wallets.some((wallet) => wallet.id === editing.fromId) || !wallets.some((wallet) => wallet.id === editing.toId));
  const tooFew = !loading && !walletsError && wallets.length < 2;
  const invalid = !from || !to || same || value <= 0 || short || pctTooHigh || archivedWallet || !date;

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (invalid || isPending || !online || !from || !to) return;
    const input = {
      fromAccountId: from.id,
      toAccountId: to.id,
      amount: value,
      date,
      description: note.trim() || undefined,
      ...(fee > 0 && { charge: fee, chargeCategory: chargedCategory }),
    };
    startTransition(async () => {
      try {
        const result = editing ? await correctTransactionAction(businessId, editing.id, "TRANSFER", input) : await createTransferAction(businessId, input);
        if (!result.success) {
          setError(t(result.message ?? "Couldn't save the transfer."));
          return;
        }
        toast.success(
          editing ? t("Transfer updated. Accounts and Ledger are updated too.") : t("Transfer saved. {from} and {to} are updated.", { from: nameOf(from), to: nameOf(to) }),
        );
        onClose();
        router.refresh();
      } catch {
        toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
      }
    });
  }

  const money = (figure: number) => formatCurrency(figure, currency, fmt);
  const sideBox = (wallet: Account | undefined, side: "from" | "to") => {
    const before = side === "from" ? fromBefore : toBefore;
    const after = side === "from" ? fromAfter : toBefore + value;
    const line = (label: string, figure: string, tone?: string) => (
      <span className="flex justify-between gap-2 text-small">
        <span className="text-ink-muted">{label}</span>
        <span className={cn("font-semibold whitespace-nowrap tabular-nums", tone)}>{figure}</span>
      </span>
    );
    return (
      <div className="flex min-w-0 flex-col gap-1.75 rounded-xl border border-divider bg-strip px-3.5 py-3">
        <span className="flex items-center justify-between gap-2 border-b border-line pb-1.5">
          <span className="truncate text-small font-bold text-ink">{wallet ? nameOf(wallet) : "—"}</span>
          <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold", side === "from" ? "bg-expense-soft text-expense" : "bg-income-soft text-income")}>{t(side === "from" ? "Sending" : "Receiving")}</span>
        </span>
        {line(t("Current balance"), money(before))}
        {side === "from" ? line(t("Transfer amount"), `− ${money(value)}`, "text-expense") : line(t("Amount received"), `+ ${money(value)}`, "text-income")}
        {side === "from"
          ? line(t("Charge · {category}", { category: fee > 0 ? t(chargedCategory) : t("none") }), fee > 0 ? `− ${money(fee)}` : money(0), fee > 0 ? "text-expense" : "text-ink-faint")
          : line(t("Charge"), money(0), "text-ink-faint")}
        <span className="mt-0.5 flex justify-between gap-2 border-t border-line pt-1.75 text-[13.5px]">
          <span className="font-semibold text-ink">{t("New balance")}</span>
          <span className={cn("font-bold whitespace-nowrap tabular-nums", after < 0 ? "text-expense" : "text-ink")}>{after < 0 ? `− ${money(-after)}` : money(after)}</span>
        </span>
      </div>
    );
  };

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={560}
      title={t(editing ? "Edit transfer" : "New transfer")}
      onSubmit={save}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={invalid || isPending || !online}>
            {isPending && <Loader size={16} onDark label={t("Saving...")} />}
            {t(editing ? "Save changes" : "Save transfer")}
          </Button>
        </>
      }
    >
      {archivedWallet && (
        <Banner tone="warning" inline icon={<TriangleAlert />}>
          {t("An account this transfer used has been archived. Make it active again in Accounts to edit the transfer.")}
        </Banner>
      )}

      <Field htmlFor="transfer-date" label={<span className="text-small font-semibold text-ink-2">{t("Date")}</span>}>
        <DayInput id="transfer-date" size="md" value={date} onChange={setDate} max={getAppToday()} />
      </Field>

      <div className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)]">
        <WalletPicker
          label={t("From account (money goes out)")}
          size="lg"
          tone="sand"
          wallets={wallets.filter((wallet) => wallet.id !== pair.toId)}
          value={pair.fromId}
          onChange={(id) => setPair((previous) => ({ ...previous, fromId: id }))}
          after={null}
          currency={currency}
          loading={loading}
          error={walletsError}
          onClose={onClose}
        />
        <button
          type="button"
          onClick={() => setPair({ fromId: pair.toId, toId: pair.fromId })}
          disabled={!from || !to}
          aria-label={t("Swap From and To")}
          title={t("Swap")}
          className="hidden h-14 items-center justify-center rounded-full text-ink-faint hover:text-emerald disabled:opacity-60 sm:flex"
        >
          <ArrowRight className="size-4.5" aria-hidden="true" />
        </button>
        <WalletPicker
          label={t("To account (money comes in)")}
          size="lg"
          wallets={wallets.filter((wallet) => wallet.id !== pair.fromId)}
          value={pair.toId}
          onChange={(id) => setPair((previous) => ({ ...previous, toId: id }))}
          after={null}
          currency={currency}
          loading={loading}
          error={null}
          onClose={onClose}
          emptyMessage={
            tooFew && (
              <>
                {t("Moving money needs two accounts.")}{" "}
                {wallets.length === 1 && (
                  <Link href="/balance/accounts?new=1" onNavigate={onClose} className="font-semibold text-emerald hover:underline">
                    {t("Add an account")}
                  </Link>
                )}
              </>
            )
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field htmlFor="transfer-amount" label={<span className="text-small font-semibold text-ink-2">{t("Amount ({symbol})", { symbol: currencySymbol(currency, fmt) })}</span>}>
          <AmountInput id="transfer-amount" size="field" value={amount} onChange={setAmount} currency={currency} autoFocus={!editing} />
        </Field>
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex h-5 items-center justify-between gap-2">
            <label htmlFor="transfer-charge" className="text-small font-semibold text-ink-2">
              {t("Charge")} ({chargeMode === "pct" ? "%" : currencySymbol(currency, fmt)})
            </label>
            <span role="group" aria-label={t("Charge as")} className="flex gap-0.5 rounded-full bg-surface-sunken p-0.5">
              {(["tk", "pct"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={chargeMode === mode}
                  aria-label={mode === "tk" ? t("Amount") : t("Percent")}
                  onClick={() => {
                    if (mode === chargeMode) return;
                    // Back to taka keeps what the percent came to.
                    setCharge(mode === "tk" && fee > 0 ? String(fee) : "");
                    setChargeMode(mode);
                  }}
                  className={cn("h-5.5 rounded-full px-2.25 text-[11.5px] font-semibold", chargeMode === mode ? "bg-surface text-ink shadow-[0_1px_2px_rgba(18,32,29,0.12)] dark:bg-surface-raised" : "text-ink-muted")}
                >
                  {mode === "tk" ? currencySymbol(currency, fmt) : "%"}
                </button>
              ))}
            </span>
          </div>
          {chargeMode === "tk" ? (
            <AmountInput id="transfer-charge" size="field" value={charge} onChange={setCharge} currency={currency} placeholder={t("0 if there is no charge")} />
          ) : (
            <Input
              id="transfer-charge"
              size="md"
              inputMode="decimal"
              value={toLocaleDigits(charge, fmt)}
              onChange={(event) => setCharge(event.target.value)}
              placeholder={t("e.g. 1.85")}
              invalid={pctTooHigh}
              className="tabular-nums"
            />
          )}
          {chargeMode === "pct" && value > 0 && fee > 0 && !pctTooHigh && (
            <span className="text-caption font-semibold text-emerald">{t("{percent}% of {amount} = {charge}", { percent: toLocaleDigits(charge, fmt), amount: money(value), charge: money(fee) })}</span>
          )}
          {pctTooHigh && <span className="text-caption text-expense">{t("A charge can't be more than 100%.")}</span>}
        </div>
      </div>

      <Field
        htmlFor="transfer-category"
        label={<span className={cn("text-small font-semibold text-ink-2", fee <= 0 && "opacity-50")}>{t("Expense category for the charge")}</span>}
        hint={t(fee > 0 ? "The charge is saved as an expense in this category." : "Enter a charge to choose a category. No charge, no expense.")}
      >
        <NativeSelect id="transfer-category" value={chargedCategory} onChange={(event) => setCategory(event.target.value)} disabled={fee <= 0} aria-describedby="transfer-category-hint">
          {categoryOptions.map((name) => (
            <option key={name} value={name}>
              {t(name)}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field htmlFor="transfer-note" label={<span className="text-small font-semibold text-ink-2">{t("Note")}</span>}>
        <Input id="transfer-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder={t("e.g. ATM withdrawal")} />
      </Field>

      {(from || to) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {sideBox(from, "from")}
          {sideBox(to, "to")}
        </div>
      )}
      {same && <p className="-mt-1 text-small text-expense">{t("From and To must be different accounts.")}</p>}
      {short && from && <p className="-mt-1 text-small text-expense">{t("{account} doesn't have enough balance for this transfer and charge.", { account: nameOf(from) })}</p>}
      {error && (
        <p role="alert" className="text-small text-expense">
          {error}
        </p>
      )}
    </PopupDialog>
  );
}
