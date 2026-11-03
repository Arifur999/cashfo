"use client";

import { ArrowDownLeft, ArrowUpRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { useOnline } from "@/components/modules/Customer/Layout/useOnline";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import type { LedgerKind, LedgerRow } from "@/lib/customer/api";
import { entrySource, LEDGER_KIND_META, partyOf } from "@/lib/customer/balanceDisplay";
import { balanceText } from "@/lib/customer/accountDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { voidTransactionAction } from "@/lib/customer/transactionActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface LedgerEntryDialogProps {
  entry: { row: LedgerRow; kind: LedgerKind; direction: "in" | "out" } | null;
  // The ledger's account, as the page names it, and what it holds now.
  accountName: string;
  accountBalance: string;
  businessId: string;
  canManage: boolean;
  currency: string;
  onClose: () => void;
}

// Entry details (board: Ledger — Entry details popup): what the entry was,
// how much, when, with whom, its note, reference and the balance after it,
// why it is here, and the way to where it was made. An adjustment from
// Match real balance can be removed right here.
export function LedgerEntryDialog({ entry, accountName, accountBalance, businessId, canManage, currency, onClose }: LedgerEntryDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const online = useOnline();
  const [isPending, startTransition] = useTransition();
  if (!entry) return null;
  const { row, kind, direction } = entry;
  const meta = LEDGER_KIND_META[kind];
  const isIn = direction === "in";
  const party = partyOf(row, kind);
  const source = entrySource(row, kind);
  const amount = Number(row.amount);

  const why =
    row.chargeForId && row.chargeFor
      ? t("The fee for the transfer to {name}. It is saved as an expense, so it counts in Money out.", { name: row.chargeFor })
      : kind === "TRANSFER" && party
        ? isIn
          ? t("Moved from {other} into {account}. It also shows in the {other} ledger.", { other: party, account: accountName })
          : t("Moved from {account} to {other}. It also shows in the {other} ledger.", { other: party, account: accountName })
        : kind === "ADJUSTMENT"
          ? t("Added with Match real balance on the Accounts page, so this ledger matches your bank or wallet app.")
          : (kind === "ASSET_PURCHASE" || kind === "ASSET_SALE") && party
            ? kind === "ASSET_SALE"
              ? t("Money from selling {asset}, recorded in Assets Management › Purchase & Sell.", { asset: party })
              : t("Paid for {asset}, recorded in Assets Management › Purchase & Sell.", { asset: party })
            : null;

  function removeAdjustment() {
    if (isPending || !online) return;
    startTransition(async () => {
      try {
        const result = await voidTransactionAction(businessId, row.transactionId, "Adjustment removed");
        if (!result.success) {
          toast.error(t(result.message ?? "Couldn't remove the adjustment."));
          return;
        }
        const back = Number(accountBalance) + (isIn ? -amount : amount);
        toast.success(t("Adjustment removed. {name} is back to {amount}.", { name: accountName, amount: balanceText(back, currency, fmt) }));
        onClose();
        router.refresh();
      } catch {
        toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
      }
    });
  }

  const lines: [string, string][] = [
    [t("Account"), accountName],
    [t(isIn ? meta.kickerIn : meta.kickerOut), party ? t(party) : "—"],
    [t("Note"), row.description ? t(row.description) : "—"],
    ...(row.referenceNo ? [[t("Reference"), row.referenceNo] as [string, string]] : []),
    [t("Balance after"), balanceText(row.runningBalance, currency, fmt)],
  ];

  return (
    <PopupDialog
      open
      onClose={onClose}
      busy={isPending}
      width={460}
      title={t("Entry details")}
      bodyClassName="gap-4 py-5"
      footer={
        <>
          {kind === "ADJUSTMENT" && canManage && (
            <Button variant="secondary" onClick={removeAdjustment} disabled={isPending || !online} className="mr-auto border-expense/40 text-expense hover:bg-expense-soft">
              {isPending && <Loader size={16} label={t("Removing...")} />}
              {t("Remove adjustment")}
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Close")}
          </Button>
          {source && (
            <Button asChild>
              <Link href={source.href}>
                {t(source.label)}
                <ChevronRight className="size-3.5" strokeWidth={2.5} />
              </Link>
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col items-start gap-2">
        <span className="flex items-center gap-2">
          <Chip tone={meta.tone} size="sm" className="font-semibold">
            {t(meta.label)}
          </Chip>
          <span className={cn("inline-flex items-center gap-1.25 text-small font-semibold", isIn ? "text-income" : "text-expense")}>
            <span className={cn("flex size-5.5 items-center justify-center rounded-full", isIn ? "bg-income-soft" : "bg-expense-soft")}>
              {isIn ? <ArrowDownLeft className="size-3" strokeWidth={2.5} aria-hidden="true" /> : <ArrowUpRight className="size-3" strokeWidth={2.5} aria-hidden="true" />}
            </span>
            {t(isIn ? "Received" : "Sent")}
          </span>
        </span>
        <span className={cn("text-[30px] leading-tight font-bold tracking-[-0.02em] tabular-nums", isIn ? "text-income" : "text-expense")}>{`${isIn ? "+" : "−"} ${formatCurrency(amount, currency, fmt)}`}</span>
        <span className="text-small text-ink-muted">{formatDate(row.date, undefined, fmt)}</span>
      </div>
      <dl className="flex flex-col overflow-hidden rounded-[14px] border border-line">
        {lines.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[130px_minmax(0,1fr)] gap-3 border-b border-divider px-3.5 py-2.5 text-[13.5px] last:border-b-0">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="text-right font-semibold wrap-anywhere text-ink tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {why && <p className="rounded-xl bg-strip px-3.5 py-3 text-small leading-normal text-ink-2">{why}</p>}
    </PopupDialog>
  );
}
