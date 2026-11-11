"use client";

import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { createElement, useState, useTransition } from "react";
import { toast } from "sonner";
import { useOnline } from "@/components/modules/Customer/Layout/useOnline";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { adjustBalanceAction } from "@/lib/customer/accountActions";
import type { WalletOverviewRow } from "@/lib/customer/api";
import { accountColor, matchState, walletColorStyle } from "@/lib/customer/balanceDisplay";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { walletIcon } from "@/lib/customer/walletVisuals";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BALANCE_POPUP } from "./popupLook";

interface AdjustBalanceDialogProps {
  account: WalletOverviewRow | null;
  // Its name as the page shows it, and its kind ("Bank account · 7890").
  name: string;
  kind: string;
  onClose: () => void;
  businessId: string;
  currency: string;
  // The adjustment posted (or the balances already matched): what to say.
  onDone: (message: string, values: Record<string, string>) => void;
}

// Match real balance (board: Accounts — Match real balance popup): what
// Smartly shows beside what the bank or wallet app shows, the difference in
// words, and a note. Saving posts one adjustment to the ledger, which can be
// removed there any time.
export function AdjustBalanceDialog({ account, name, kind, onClose, businessId, currency, onDone }: AdjustBalanceDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const online = useOnline();
  const [real, setReal] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevId, setPrevId] = useState<string | null>(null);
  const id = account?.id ?? null;
  if (id !== prevId) {
    setPrevId(id);
    setReal("");
    setNote("");
    setError("");
  }

  if (!account) return null;
  const current = Number(account.currentBalance);
  const state = matchState(current, real);
  const money = (value: number) => formatCurrency(Math.abs(value), currency, fmt);

  function save() {
    if (!account || isPending || !online || state.state === "idle") return;
    if (state.state === "ok") {
      onDone("{name} matches your real balance", { name });
      onClose();
      return;
    }
    const realBalance = Math.round((current + state.difference) * 100) / 100;
    startTransition(async () => {
      try {
        const result = await adjustBalanceAction(businessId, account.id, { realBalance, ...(note.trim() && { note: note.trim() }) });
        if (!result.success || !result.data) {
          setError(t(result.message ?? "Couldn't match the balance."));
          return;
        }
        const difference = Number(result.data.difference);
        // Matched by the time it arrived (another change landed first).
        if (!result.data.adjusted) onDone("{name} matches your real balance", { name });
        else onDone("{name} now matches. Adjustment of {amount} added to its ledger.", { name, amount: `${difference > 0 ? "+" : "−"} ${money(difference)}` });
        onClose();
        router.refresh();
      } catch {
        toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
      }
    });
  }

  const status =
    state.state === "idle"
      ? { icon: Info, tone: "border-divider bg-strip text-ink-soft", text: t("Type the balance your bank or wallet app shows right now.") }
      : state.state === "ok"
        ? { icon: CircleCheck, tone: "border-tint-emerald-ink/30 bg-tint-emerald/45 text-tint-emerald-ink", text: t("They match. Nothing to fix.") }
        : {
            icon: TriangleAlert,
            tone: "border-warning-line bg-warning-50 text-warning-ink",
            text:
              state.difference > 0
                ? t("Your real balance is {amount} more. Smartly adds {amount} as an adjustment so both match.", { amount: money(state.difference) })
                : t("Your real balance is {amount} less. Smartly takes off {amount} as an adjustment so both match.", { amount: money(state.difference) }),
          };

  return (
    <PopupDialog
      open
      onClose={onClose}
      busy={isPending}
      width={480}
      {...BALANCE_POPUP}
      bodyClassName="gap-3.5 px-5.5 py-4.5"
      title={t("Match your real balance")}
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending} className="h-10.5 px-4.5">
            {t("Cancel")}
          </Button>
          <Button type="submit" disabled={isPending || !online || state.state === "idle"} className="h-10.5 px-5">
            {isPending && <Loader size={16} onDark label={t("Saving...")} />}
            {t(state.state === "ok" ? "Done" : "Match balance")}
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-3" style={walletColorStyle(accountColor(account))}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] wallet-tile [&_svg]:size-4.5">{createElement(walletIcon(account), { "aria-hidden": true })}</span>
        <span className="flex min-w-0 flex-col gap-px">
          <span className="truncate text-[15px] font-semibold text-ink">{name}</span>
          <span className="text-caption text-ink-muted">{kind}</span>
        </span>
      </div>
      <p className="text-[13.5px] leading-[1.55] text-ink-2">
        {t("Open your bank or wallet app and check the balance there. If Smartly shows something different, one adjustment makes them match. It shows in the ledger, and you can remove it any time.")}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-small font-semibold text-ink-2">{t("Smartly shows")}</span>
          <span className="flex h-11 items-center rounded-field bg-surface-sunken px-3 text-[15px] font-bold text-ink tabular-nums">{formatCurrency(current, currency, fmt)}</span>
        </div>
        <Field htmlFor="adjust-real" label={<span className="text-small font-semibold text-ink-2">{t("Real balance ({symbol})", { symbol: currencySymbol(currency, fmt) })}</span>}>
          <Input
            id="adjust-real"
            size="md"
            inputMode="decimal"
            value={toLocaleDigits(real, fmt)}
            onChange={(event) => {
              setReal(event.target.value);
              setError("");
            }}
            placeholder={toLocaleDigits("0", fmt)}
            autoFocus
            className="text-[15px] font-semibold tabular-nums"
          />
        </Field>
      </div>
      <div role="status" className={cn("flex items-start gap-2.5 rounded-[12px] border px-3.5 py-3 text-[13.5px] leading-normal", status.tone)}>
        <status.icon className="mt-px size-4.25 shrink-0" aria-hidden="true" />
        <span>{status.text}</span>
      </div>
      <Field
        htmlFor="adjust-note"
        label={
          <span className="text-small font-semibold text-ink-2">
            {t("Note")} <span className="font-normal text-ink-muted">{t("(optional)")}</span>
          </span>
        }
      >
        <Input id="adjust-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={60} placeholder={t("e.g. SMS fees I forgot to add")} />
      </Field>
      {error && (
        <p role="alert" className="text-small text-expense">
          {error}
        </p>
      )}
    </PopupDialog>
  );
}
