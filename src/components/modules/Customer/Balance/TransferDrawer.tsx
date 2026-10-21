"use client";

import { ArrowUpDown, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useOnline } from "@/components/modules/Customer/Layout/useOnline";
import { WalletPicker } from "@/components/modules/Customer/Shared/WalletPicker";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Account } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { createTransferAction, listMoneyAccountsAction } from "@/lib/customer/quickEntryActions";
import { transferPair, type TransferPair } from "@/lib/customer/transfers";
import { getAppToday } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import AmountInput from "@/components/modules/Customer/Shared/AmountInput";

interface TransferDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
}

// The 36px round and square buttons, 44px under a finger.
const TOUCH = "pointer-coarse:size-11";

// Move money between the customer's own wallets: from where (with what it
// holds) and to where, the round button between them swapping the two; how
// much, the day and a note; and both wallets after the move -- the total
// stays the same, since a transfer is never income or expense.
export function TransferDrawer({ open, onClose, businessId, currency }: TransferDrawerProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  // Offline, Move money waits for the connection instead of failing on send.
  const online = useOnline();
  const [pair, setPair] = useState<TransferPair>({ fromId: "", toId: "" });
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getAppToday());
  const [note, setNote] = useState("");
  const [wallets, setWallets] = useState<Account[]>([]);
  const [walletsError, setWalletsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { fromId, toId } = pair;

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
    let current = true;
    listMoneyAccountsAction(businessId)
      .then((money) => {
        if (!current) return;
        const list = money.data ?? [];
        setWallets(list);
        setWalletsError(money.success ? null : (money.message ?? "Failed to load your wallets"));
        // The last choice stays while it's still offered; a wallet archived
        // since then gives way to the first ones.
        setPair((previous) => transferPair(list.map((wallet) => wallet.id), previous));
        setLoading(false);
      })
      // Offline, or the server out of reach: say so instead of "Loading..."
      // for ever.
      .catch(() => {
        if (!current) return;
        setWalletsError("Failed to load your wallets");
        setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [open, businessId]);

  const value = Number(amount) || 0;
  const from = wallets.find((w) => w.id === fromId);
  const to = wallets.find((w) => w.id === toId);
  const available = from ? Number(from.currentBalance) : 0;
  const total = wallets.reduce((sum, wallet) => sum + Number(wallet.currentBalance), 0);
  const valid = value > 0 && !!from && !!to && fromId !== toId;
  // One wallet (or none) has nowhere to move money to.
  const tooFew = !loading && !walletsError && wallets.length < 2;
  // The API takes a transfer larger than the wallet holds; say what it does.
  const overdraws = !!from && value > available;
  // The names as the pickers show them: "নগদ" for Cash in Bangla.
  const nameOf = (wallet: Account) => accountDisplayName(wallet, displayLanguage(locale));

  function swap() {
    setPair({ fromId: toId, toId: fromId });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending || !online) return;
    startTransition(async () => {
      try {
        const result = await createTransferAction(businessId, { fromAccountId: fromId, toAccountId: toId, amount: value, date, description: note.trim() || undefined });
        if (result.success) {
          toast.success(t("Money moved"));
          onClose();
          router.refresh();
        } else {
          toast.error(t(result.message ?? "Couldn't move the money"));
        }
      } catch {
        // The request never got an answer (offline): nothing was moved.
        toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
      }
    });
  }

  const label = (text: string, optional = false) => (
    <span className="text-body font-medium text-ink">
      {text} {optional && <span className="font-normal text-ink-muted">({t("optional")})</span>}
    </span>
  );

  // One wallet's balance now and after, in the "After this transfer" box. A
  // wallet left below zero shows in amber.
  const afterRow = (wallet: Account, change: number) => {
    const after = Number(wallet.currentBalance) + change;
    return (
      <div className="flex justify-between gap-3">
        <span className="truncate text-ink-2">{nameOf(wallet)}</span>
        <span>
          <span className="text-ink-muted">{formatCurrency(wallet.currentBalance, currency)} → </span>
          <span className={cn("font-semibold", after < 0 ? "text-warning" : "text-ink")}>{formatCurrency(after, currency)}</span>
        </span>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent
        side={wide ? "right" : "bottom"}
        showCloseButton={false}
        className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-110 shadow-drawer data-[side=right]:sm:max-w-110" : "rounded-t-xl data-[side=bottom]:h-[92vh]")}
      >
        <SheetHeader className={cn("flex-row items-start justify-between gap-3 space-y-0", wide ? "border-b border-line p-6" : "px-4 pt-4 pb-2")}>
          <span className="flex flex-col gap-1">
            <SheetTitle className="text-h3 text-ink">{t("Move money")}</SheetTitle>
            <SheetDescription className="text-small leading-[normal] text-ink-muted">{t("Between your own wallets")}</SheetDescription>
          </span>
          <button type="button" onClick={onClose} aria-label={t("Close")} className={cn("flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken", TOUCH)}>
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn("flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto", wide ? "p-6" : "px-4 py-3")}>
            <div className="flex flex-col gap-2">
              <WalletPicker
                label={t("From")}
                size="2xl"
                tone="sand"
                balanceLabel="Available@@balance"
                wallets={wallets.filter((w) => w.id !== toId)}
                value={fromId}
                onChange={(id) => setPair((previous) => ({ ...previous, fromId: id }))}
                after={null}
                currency={currency}
                loading={loading}
                error={walletsError}
                onClose={onClose}
              />
              {tooFew ? (
                // Nothing to swap with: just the room the button would take.
                <span aria-hidden="true" className="h-1" />
              ) : (
                <div className="-mt-0.5 -mb-6 flex justify-center">
                  <button
                    type="button"
                    onClick={swap}
                    disabled={!from || !to}
                    aria-label={t("Swap From and To")}
                    title={t("Swap")}
                    className={cn(
                      "relative z-10 flex size-9 items-center justify-center rounded-full border border-line-strong bg-surface text-emerald shadow-[0_2px_6px_rgba(14,26,22,0.08)] hover:bg-surface-sunken hover:text-brand-ink disabled:opacity-60",
                      TOUCH,
                    )}
                  >
                    <ArrowUpDown className="size-4" strokeWidth={2.25} aria-hidden="true" />
                  </button>
                </div>
              )}
              <WalletPicker
                label={t("To@@wallet")}
                size="2xl"
                wallets={wallets.filter((w) => w.id !== fromId)}
                value={toId}
                onChange={(id) => setPair((previous) => ({ ...previous, toId: id }))}
                after={null}
                currency={currency}
                loading={loading}
                error={null}
                onClose={onClose}
                // With one wallet (or none) there's nowhere to move money to:
                // why the button stays grey, and the way on.
                emptyMessage={
                  tooFew && (
                    <>
                      {t("Moving money needs two wallets.")}{" "}
                      {wallets.length === 1 && (
                        <Link href="/balance/wallet?new=1" onNavigate={onClose} className="font-semibold text-emerald hover:underline">
                          {t("Add a wallet")}
                        </Link>
                      )}
                    </>
                  )
                }
              />
            </div>

            <Field
              htmlFor="move-amount"
              label={label(t("Amount"))}
              hint={
                from ? (
                  <>
                    <span className={cn("block", overdraws && "text-warning")}>
                      {available > 0 ? t("Up to {amount} available in {wallet}", { amount: formatCurrency(available, currency), wallet: nameOf(from) }) : t("{wallet} has {amount}", { wallet: nameOf(from), amount: formatCurrency(available, currency) })}
                    </span>
                    {overdraws && (
                      <span className="mt-1 flex items-center gap-1.5 font-medium text-warning">
                        <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
                        {t("This leaves {wallet} at {amount}.", { wallet: nameOf(from), amount: formatCurrency(available - value, currency) })}
                      </span>
                    )}
                  </>
                ) : undefined
              }
            >
              {/* The hint (what the wallet holds, what the move leaves) is read out with the field. */}
              <AmountInput id="move-amount" value={amount} onChange={setAmount} currency={currency} autoFocus describedBy={from ? "move-amount-hint" : undefined} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field htmlFor="move-date" label={label(t("Date"))}>
                <DayInput id="move-date" size="md" value={date} onChange={setDate} max={getAppToday()} />
              </Field>
              <Field htmlFor="move-note" label={label(t("Note"), true)}>
                <Input id="move-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder={t("e.g. Card bill")} className="px-0" frameClassName="px-3" />
              </Field>
            </div>

            {from && to && value > 0 && (
              <div className="flex flex-col gap-3 rounded-md border border-line bg-strip p-4 text-body tabular-nums">
                <span className="text-caption font-semibold text-ink-muted">{t("After this transfer")}</span>
                {afterRow(from, -value)}
                {afterRow(to, value)}
                <div className="flex justify-between gap-3 border-t border-line pt-3 text-small text-ink-muted">
                  {/* Active wallets only, as on My wallets: what can be moved. */}
                  <span>{t("Available balance")}</span>
                  <span>
                    {formatCurrency(total, currency)} · {t("unchanged")}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className={cn("flex items-center justify-end gap-3 border-t border-line bg-surface", wide ? "px-6 py-4" : "px-4 pt-3 pb-6")}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="action" disabled={!valid || isPending || !online} className="px-5">
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {value > 0 ? t("Move {amount}", { amount: formatCurrency(value, currency) }) : t("Move money")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
