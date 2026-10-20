"use client";

import { ArrowUpDown, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { WalletPicker } from "@/components/modules/Customer/Shared/WalletPicker";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Account } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { createTransferAction, listMoneyAccountsAction } from "@/lib/customer/quickEntryActions";
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

// Move money between the customer's own wallets: from where (with what it
// holds) and to where, the round button between them swapping the two; how
// much, the day and a note; and both wallets after the move -- the total
// stays the same, since a transfer is never income or expense.
export function TransferDrawer({ open, onClose, businessId, currency }: TransferDrawerProps) {
  const { t } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getAppToday());
  const [note, setNote] = useState("");
  const [wallets, setWallets] = useState<Account[]>([]);
  const [walletsError, setWalletsError] = useState<string | null>(null);
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
    listMoneyAccountsAction(businessId).then((money) => {
      const list = money.data ?? [];
      setWallets(list);
      setWalletsError(money.success ? null : (money.message ?? "Failed to load your wallets"));
      setFromId((current) => current || list[0]?.id || "");
      setToId((current) => current || list[1]?.id || "");
      setLoading(false);
    });
  }, [open, businessId]);

  const value = Number(amount) || 0;
  const from = wallets.find((w) => w.id === fromId);
  const to = wallets.find((w) => w.id === toId);
  const available = from ? Number(from.currentBalance) : 0;
  const total = wallets.reduce((sum, wallet) => sum + Number(wallet.currentBalance), 0);
  const valid = value > 0 && !!from && !!to && fromId !== toId;

  function swap() {
    setFromId(toId);
    setToId(fromId);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const result = await createTransferAction(businessId, { fromAccountId: fromId, toAccountId: toId, amount: value, date, description: note.trim() || undefined });
      if (result.success) {
        toast.success(t("Transfer completed"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to create transfer"));
      }
    });
  }

  const label = (text: string, optional = false) => (
    <span className="text-body font-medium text-ink">
      {text} {optional && <span className="font-normal text-ink-muted">({t("optional")})</span>}
    </span>
  );

  // One wallet's balance now and after, in the "After this transfer" box.
  const afterRow = (wallet: Account, change: number) => (
    <div className="flex justify-between gap-3">
      <span className="truncate text-ink-2">{wallet.name}</span>
      <span>
        <span className="text-ink-muted">{formatCurrency(wallet.currentBalance, currency)} → </span>
        <span className="font-semibold text-ink">{formatCurrency(Number(wallet.currentBalance) + change, currency)}</span>
      </span>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent
        side={wide ? "right" : "bottom"}
        showCloseButton={false}
        className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-110 shadow-[-28px_0_60px_-16px_rgba(11,61,46,0.3)] data-[side=right]:sm:max-w-110" : "rounded-t-xl data-[side=bottom]:h-[92vh]")}
      >
        <SheetHeader className={cn("flex-row items-start justify-between gap-3 space-y-0", wide ? "border-b border-line p-6" : "px-4 pt-4 pb-2")}>
          <span className="flex flex-col gap-1">
            <SheetTitle className="text-h3 text-ink">{t("Move money")}</SheetTitle>
            <SheetDescription className="text-small leading-[normal] text-ink-muted">{t("Between your own wallets")}</SheetDescription>
          </span>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
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
                onChange={setFromId}
                after={null}
                currency={currency}
                loading={loading}
                error={walletsError}
                onClose={onClose}
              />
              <div className="-mt-0.5 -mb-6 flex justify-center">
                <button
                  type="button"
                  onClick={swap}
                  disabled={!from || !to}
                  aria-label={t("Swap From and To")}
                  title={t("Swap")}
                  className="relative z-10 flex size-9 items-center justify-center rounded-full border border-line-strong bg-surface text-emerald shadow-[0_2px_6px_rgba(14,26,22,0.08)] hover:bg-surface-sunken disabled:opacity-60"
                >
                  <ArrowUpDown className="size-4" strokeWidth={2.25} aria-hidden="true" />
                </button>
              </div>
              <WalletPicker
                label={t("To@@wallet")}
                size="2xl"
                wallets={wallets.filter((w) => w.id !== fromId)}
                value={toId}
                onChange={setToId}
                after={null}
                currency={currency}
                loading={loading}
                error={null}
                onClose={onClose}
              />
            </div>

            <Field
              htmlFor="move-amount"
              label={label(t("Amount"))}
              hint={
                from && available > 0 ? (
                  <span className={cn(value > available && "text-warning")}>{t("Up to {amount} available in {wallet}", { amount: formatCurrency(available, currency), wallet: from.name })}</span>
                ) : undefined
              }
            >
              <AmountInput id="move-amount" value={amount} onChange={setAmount} currency={currency} autoFocus />
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
                  <span>{t("Total balance")}</span>
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
            <Button type="submit" variant="action" disabled={!valid || isPending} className="px-5">
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {value > 0 ? t("Move {amount}", { amount: formatCurrency(value, currency) }) : t("Move money")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
