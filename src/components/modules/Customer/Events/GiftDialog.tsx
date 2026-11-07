"use client";

import { Banknote, Check, Gift } from "lucide-react";
import { useEffect, useState } from "react";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Account } from "@/lib/customer/api";
import type { EventPerson, GiftDirection, GiftKind, NewGiftInput, SocialEvent } from "@/lib/customer/eventsTypes";
import { listMoneyAccountsAction } from "@/lib/customer/quickEntryActions";
import { cn } from "@/lib/utils";
import { PopupDialog } from "../Shared/PopupDialog";
import { FIELD, LABEL } from "./AddEventDialog";
import { Segmented } from "./EventControls";
import type { EventWords } from "./useEventWords";

export interface GiftStart {
  event: SocialEvent;
  direction: GiftDirection;
  personId: string;
  // A suggested amount in paisa (what evens things up), or 0.
  amount: number;
}

interface GiftDialogProps {
  start: GiftStart | null;
  businessId: string;
  people: EventPerson[];
  words: EventWords;
  busy: boolean;
  onClose: () => void;
  // Answers an error to show, or null once saved. `walletName` names the
  // wallet for the toast.
  onSave: (event: SocialEvent, input: NewGiftInput, walletName: string | null) => Promise<string | null>;
}

const NEW_PERSON = "__new__";
const QUICK = [500, 1000, 2000, 5000];

// The board's Write down a gift: given or received, to or from whom, cash
// or an item, how much (or about what it is worth), and for cash given,
// whether it also goes into Transactions and from which wallet.
export function GiftDialog(props: GiftDialogProps) {
  return props.start ? <GiftForm key={`${props.start.event.id}:${props.start.direction}`} {...props} start={props.start} /> : null;
}

function GiftForm({ start, businessId, people, words, busy, onClose, onSave }: GiftDialogProps & { start: GiftStart }) {
  const { t, fmt, money } = words;
  const [direction, setDirection] = useState<GiftDirection>(start.direction);
  const [personId, setPersonId] = useState(start.personId);
  const [newName, setNewName] = useState("");
  const [kind, setKind] = useState<GiftKind>("CASH");
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState(start.amount ? String(Math.round(start.amount / 100)) : "");
  const [toTransactions, setToTransactions] = useState(true);
  const [walletId, setWalletId] = useState("");
  const [wallets, setWallets] = useState<{ list: Account[]; loading: boolean; failed: boolean }>({ list: [], loading: true, failed: false });
  const [error, setError] = useState<string | null>(null);
  const showWallet = direction === "GAVE" && kind === "CASH";

  // The money wallets, read once the popup opens.
  useEffect(() => {
    let live = true;
    listMoneyAccountsAction(businessId)
      .then((result) => {
        if (!live) return;
        const list = result.data ?? [];
        setWallets({ list, loading: false, failed: !result.success });
        setWalletId((current) => current || list[0]?.id || "");
      })
      .catch(() => live && setWallets({ list: [], loading: false, failed: true }));
    return () => {
      live = false;
    };
  }, [businessId]);

  const lang = displayLanguage(fmt.locale);
  const amountNumber = Number(amount) || 0;
  const change = (apply: () => void) => {
    apply();
    setError(null);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!personId || (personId === NEW_PERSON && !name)) return setError(t("Pick who gave or received it."));
    if (kind === "ITEM" && !item.trim()) return setError(t("Write what the gift was."));
    if (!amountNumber) return setError(kind === "ITEM" ? t("Write about how much it is worth.") : t("Write how much."));
    const postIt = showWallet && toTransactions;
    if (postIt && !walletId) return setError(t("Pick the wallet it was paid from."));
    const wallet = wallets.list.find((row) => row.id === walletId);
    const problem = await onSave(
      start.event,
      {
        direction,
        ...(personId === NEW_PERSON ? { personName: name } : { personId }),
        kind,
        ...(kind === "ITEM" && { item: item.trim() }),
        amount: amountNumber,
        ...(postIt && { fromAccountId: walletId }),
      },
      postIt && wallet ? accountDisplayName(wallet, lang) : null,
    );
    if (problem) setError(problem);
  };

  return (
    <PopupDialog
      open
      onClose={onClose}
      busy={busy}
      className="leading-[normal]"
      width={520}
      title={t("Write down a gift")}
      sub={<span className="block truncate">{start.event.title}</span>}
      onSubmit={save}
      bodyClassName="gap-4 py-5"
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="h-10.5 rounded-full border border-input bg-surface px-4 text-body font-semibold text-ink hover:bg-surface-sunken disabled:opacity-50">
            {t("Cancel")}
          </button>
          <button type="submit" disabled={busy} className="h-10.5 rounded-full bg-primary px-5 text-body font-semibold text-primary-foreground hover:bg-emerald-hover disabled:opacity-50">
            {busy ? t("Saving...") : t("Save gift")}
          </button>
        </>
      }
    >
      <Segmented
        label={t("Who gave")}
        value={direction}
        onChange={(value) => change(() => setDirection(value))}
        options={[
          { value: "GAVE", label: t("I gave") },
          { value: "GOT", label: t("I received") },
        ]}
      />
      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>{t(direction === "GAVE" ? "Given to" : "Given by")}</span>
        <select value={personId} onChange={(event) => change(() => setPersonId(event.target.value))} aria-invalid={(!!error && !personId) || undefined} className={FIELD}>
          <option value="">{t("Pick a person")}</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
          <option value={NEW_PERSON}>{t("+ Someone new")}</option>
        </select>
      </label>
      {personId === NEW_PERSON && (
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t("Their name")}</span>
          <input type="text" value={newName} onChange={(event) => change(() => setNewName(event.target.value))} maxLength={60} autoFocus className={FIELD} />
        </label>
      )}
      <div role="radiogroup" aria-label={t("Gift type")} className="flex gap-2">
        {(
          [
            { value: "CASH", label: t("Cash@@gift kind"), Icon: Banknote },
            { value: "ITEM", label: t("A gift item"), Icon: Gift },
          ] as const
        ).map(({ value, label, Icon }) => {
          const on = kind === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => change(() => setKind(value))}
              className={cn("flex h-10.5 flex-1 items-center justify-center gap-2 rounded-[12px] text-body text-ink", on ? "border-[1.5px] border-primary bg-emerald-soft font-semibold" : "border border-input bg-surface font-medium hover:bg-row-hover")}
            >
              <Icon className={cn("size-4", on ? "text-emerald" : "text-ink-muted")} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
      {kind === "ITEM" && (
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{t("What was it?")}</span>
          <input type="text" value={item} onChange={(event) => change(() => setItem(event.target.value))} placeholder={t("Gold ring, saree, dinner set")} maxLength={80} className={FIELD} />
        </label>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="gift-amount" className={LABEL}>
          {t(kind === "ITEM" ? "About how much is it worth?" : "How much?")}
        </label>
        <span className="relative block">
          <span className="pointer-events-none absolute top-3.25 left-3.5 text-[15px] text-ink-muted">৳</span>
          <input
            id="gift-amount"
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(event) => change(() => setAmount(event.target.value.replace(/[^0-9]/g, "").slice(0, 10)))}
            placeholder="0"
            aria-invalid={(!!error && !amountNumber) || undefined}
            className={cn(FIELD, "pl-8 text-[16px] font-semibold tabular-nums")}
          />
        </span>
        {kind === "CASH" && (
          <span className="flex flex-wrap gap-1.5">
            {QUICK.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => change(() => setAmount(String(value)))}
                className={cn("h-7.5 rounded-full border px-2.75 text-[12.5px] font-semibold text-ink-2", amountNumber === value ? "border-primary bg-emerald-soft" : "border-line-card bg-surface hover:bg-row-hover")}
              >
                {money(value * 100)}
              </button>
            ))}
          </span>
        )}
      </div>
      {showWallet && (
        <div className="flex flex-col gap-2.5 rounded-[12px] border border-line-card bg-table-head px-3.5 py-3">
          <button type="button" role="checkbox" aria-checked={toTransactions} onClick={() => setToTransactions((on) => !on)} className="flex items-center gap-2.25 text-left text-[13.5px] text-ink">
            <span className={cn("flex size-4.5 shrink-0 items-center justify-center rounded-[5px]", toTransactions ? "bg-primary text-primary-foreground" : "border-[1.5px] border-input bg-surface")}>
              {toTransactions && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
            </span>
            {t("Also add it to Transactions as a Gifts expense")}
          </button>
          {toTransactions && (
            <label className="flex items-center gap-2.5">
              <span className="text-small whitespace-nowrap text-ink-muted">{t("Paid from")}</span>
              {wallets.loading ? (
                <span className="text-small text-ink-faint">{t("Loading...")}</span>
              ) : wallets.list.length === 0 ? (
                <span className="text-small text-ink-muted">{t(wallets.failed ? "Failed to load your wallets" : "Add a wallet in Balance first.")}</span>
              ) : (
                <select value={walletId} onChange={(event) => change(() => setWalletId(event.target.value))} className="h-10 min-w-0 flex-1 rounded-[10px] border border-input bg-surface px-2.5 text-body text-ink outline-none focus-visible:border-emerald">
                  {wallets.list.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {accountDisplayName(wallet, lang)} · {money(Math.round(Number(wallet.currentBalance) * 100))}
                    </option>
                  ))}
                </select>
              )}
            </label>
          )}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-[10px] bg-expense-soft px-3.5 py-2.5 text-small font-medium text-expense">
          {error}
        </div>
      )}
    </PopupDialog>
  );
}
