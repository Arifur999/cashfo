"use client";

import { useState } from "react";
import { currencySymbol } from "@/lib/customer/currency";
import { dayOf, groupTyped, parseTyped } from "@/lib/customer/investmentDisplay";
import type { EntryEditInput, EntryInput, NewEntryType } from "@/lib/customer/investmentTypes";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BTN_GHOST, BTN_PRIMARY, Glyph, IC } from "./investmentLook";
import { useInvestments } from "./InvestmentsProvider";
import { edge, Err, INPUT, IvDialog, LBL, TakaInput, walletLabel } from "./ivUi";

export interface EntryOpen {
  type: NewEntryType;
  investmentId: string;
  // Set when editing that entry; its type stays.
  entryId: string | null;
}

interface Form {
  what: NewEntryType;
  iid: string;
  amount: string;
  date: string;
  acct: string;
  note: string;
}

type Field = "iid" | "amt" | "d" | "acct";

const WHATS: { what: NewEntryType; label: string; sub: string; icon: string }[] = [
  { what: "PROFIT", label: "Profit received@@entry", sub: "Money in, counts as income", icon: IC.coins },
  { what: "ADD", label: "Invested more", sub: "Capital goes up", icon: IC.plus },
  { what: "BACK", label: "Got capital back", sub: "Capital goes down, money in", icon: IC.back },
  { what: "LOSS", label: "Loss", sub: "Capital lost, no money moves", icon: IC.down },
];
const TITLES: Record<NewEntryType, string> = { PROFIT: "Record profit", ADD: "Invest more", BACK: "Take capital back", LOSS: "Record a loss" };
const ACCOUNT_LABELS: Record<NewEntryType, string> = { PROFIT: "Profit came into", ADD: "Paid from", BACK: "Money came into", LOSS: "" };
const NOTE_HINTS: Record<NewEntryType, string> = { PROFIT: "e.g. October share", ADD: "e.g. For the new machine", BACK: "e.g. Partly taken out", LOSS: "What went wrong" };
const SAVE_LABELS: Record<NewEntryType, string> = { PROFIT: "Save profit", ADD: "Save", BACK: "Save", LOSS: "Save loss" };

// Record profit, Invest more, Take capital back or Record a loss, and Edit
// entry (its type stays): the InvestApp board's entry popup.
export function EntryDialog({
  open,
  onClose,
  onSave,
  onDelete,
  busy,
}: {
  open: EntryOpen | null;
  onClose: () => void;
  onSave: (investmentId: string, input: EntryInput, entryId: string | null, edit: EntryEditInput) => Promise<boolean>;
  onDelete: (investmentId: string, entryId: string) => void;
  busy: boolean;
}) {
  const { t, fmt } = useLocale();
  const { byId, figures, openWallets, wallets, today, money, day, currency, walletName } = useInvestments();
  const [f, setF] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  const [prevOpen, setPrevOpen] = useState<EntryOpen | null>(null);
  if (open !== prevOpen) {
    setPrevOpen(open);
    setErrors({});
    if (!open) setF(null);
    else {
      const c = byId.get(open.investmentId);
      const old = open.entryId ? c?.investment.entries.find((e) => e.id === open.entryId) : null;
      if (old) setF({ what: open.type, iid: open.investmentId, amount: groupTyped(String(Number(old.amount))), date: dayOf(old.date), acct: old.accountId ?? "", note: old.note ?? "" });
      else {
        const profit = open.type === "PROFIT";
        setF({
          what: open.type,
          iid: c ? open.investmentId : "",
          amount: c && profit && c.per ? groupTyped(String(c.per)) : "",
          date: c && profit && c.status === "late" && c.next ? c.next : today,
          acct: c?.investment.profitAccountId ?? "",
          note: "",
        });
      }
    }
  }

  if (!open || !f) return <IvDialog open={false} onClose={onClose} width={560} title="" footer={null}>{null}</IvDialog>;

  const isEdit = !!open.entryId;
  const gc = byId.get(f.iid) ?? null;
  const old = isEdit ? (gc?.investment.entries.find((e) => e.id === open.entryId) ?? null) : null;
  const amountN = parseTyped(f.amount);
  const hasAcct = f.what !== "LOSS";
  const put = (patch: Partial<Form>, clear: Field[] = []) => {
    setF({ ...f, ...patch });
    if (clear.length) setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !clear.includes(key as Field))));
  };
  const oldAmount = old ? Number(old.amount) : 0;
  const avail = gc ? gc.capital + (old && (old.type === "BACK" || old.type === "LOSS") ? oldAmount : 0) - (old?.type === "ADD" ? oldAmount : 0) : 0;
  const balanceOf = (id: string) => Number(wallets.find((w) => w.id === id)?.currentBalance ?? 0);
  const signedMoney = (value: number) => `${value < 0 ? "– " : ""}${money(Math.abs(value))}`;

  const preview: { label: string; from: string; to: string; tone: string }[] = [];
  if (gc && amountN > 0) {
    const capBase = gc.capital + (old?.type === "ADD" ? -oldAmount : old && (old.type === "BACK" || old.type === "LOSS") ? oldAmount : 0);
    const capNew = f.what === "ADD" ? capBase + amountN : f.what === "BACK" || f.what === "LOSS" ? capBase - amountN : capBase;
    if (f.what !== "PROFIT") preview.push({ label: t("Capital in {name}", { name: gc.investment.name }), from: money(gc.capital), to: money(Math.max(0, capNew)), tone: capNew < 0 ? "text-loss-ink" : "text-ink" });
    else preview.push({ label: t("Profit from {name}", { name: gc.investment.name }), from: money(gc.profit), to: money(gc.profit - (old?.type === "PROFIT" ? oldAmount : 0) + amountN), tone: "text-tint-green-ink" });
    if (hasAcct && f.acct && !isEdit) {
      const before = balanceOf(f.acct);
      const after = f.what === "ADD" ? before - amountN : before + amountN;
      preview.push({ label: walletName(f.acct), from: signedMoney(before), to: signedMoney(after), tone: after < 0 ? "text-loss-ink" : "text-ink" });
    }
  }

  const save = async () => {
    const e: Partial<Record<Field, string>> = {};
    if (!gc) e.iid = t("Pick an investment.");
    if (!(amountN > 0)) e.amt = t("Enter the amount.");
    else if (amountN > 1e11) e.amt = t("The amount is too large.");
    else if (gc && (f.what === "BACK" || f.what === "LOSS") && amountN > avail) e.amt = t("This is more than the capital left ({amount}).", { amount: money(avail) });
    if (!f.date) e.d = t("Pick a date.");
    else if (f.date > today) e.d = t("The date cannot be in the future.");
    else if (gc && f.date < dayOf(gc.investment.startDate)) e.d = t("This is before the investment started ({date}).", { date: day(dayOf(gc.investment.startDate)) });
    if (hasAcct && !f.acct) e.acct = t("Pick an account.");
    if (Object.keys(e).length || !gc) {
      setErrors(e);
      return;
    }
    const amount = Math.round(amountN * 100) / 100;
    const note = f.note.trim();
    await onSave(gc.investment.id, { type: f.what, amount, date: f.date, ...(hasAcct ? { accountId: f.acct } : {}), ...(note ? { note } : {}) }, open.entryId, { amount, date: f.date, ...(hasAcct ? { accountId: f.acct } : {}), note });
  };
  const onEnter = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void save();
    }
  };

  const choosable = figures.filter((c) => !c.closed || (isEdit && c.investment.id === f.iid));
  const accountOptions = openWallets.some((w) => w.id === f.acct) || !f.acct ? openWallets : [...openWallets, ...wallets.filter((w) => w.id === f.acct)];
  const selectClass = "select-chevron cursor-pointer";

  return (
    <IvDialog
      open
      onClose={onClose}
      width={560}
      title={isEdit ? t("Edit entry") : t(TITLES[f.what])}
      footer={
        <>
          {isEdit && old && (
            <button type="button" onClick={() => onDelete(f.iid, old.id)} className={cn(BTN_GHOST, "text-loss-ink")}>
              {t("Delete")}
            </button>
          )}
          <span className="grow" />
          <button type="button" onClick={onClose} className={BTN_GHOST}>
            {t("Cancel")}
          </button>
          <button type="button" disabled={busy} onClick={() => void save()} className={cn(BTN_PRIMARY, "h-11 px-5.5")}>
            {isEdit ? t("Save changes") : t(SAVE_LABELS[f.what])}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <span className={LBL}>{t("What happened?")}</span>
        <div role="radiogroup" aria-label={t("What happened?")} className="grid grid-cols-2 gap-2">
          {WHATS.map((option) => {
            const on = f.what === option.what;
            const off = isEdit && old?.type !== option.what;
            return (
              <button
                key={option.what}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={off}
                onClick={() => {
                  if (off) return;
                  const patch: Partial<Form> = { what: option.what };
                  if (option.what === "PROFIT" && gc?.per && !f.amount) patch.amount = groupTyped(String(gc.per));
                  setErrors({});
                  setF({ ...f, ...patch });
                }}
                className={cn(
                  "flex min-h-11.5 items-center gap-2 rounded-[12px] border-[1.5px] px-3 py-2.25 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)",
                  on ? "border-emerald bg-primary-soft" : "border-line bg-surface hover:border-mint-200",
                  off && "opacity-45",
                )}
              >
                <Glyph d={option.icon} className={cn("mt-px", on ? "text-emerald" : "text-ink-muted")} />
                <span className="flex flex-col gap-px">
                  <span className={cn("text-[13.5px] font-semibold", on ? "text-forest-ink" : "text-ink")}>{t(option.label)}</span>
                  <span className="text-[11.5px] text-ink-muted">{t(option.sub)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={LBL}>{t("Investment")}</span>
        <select
          value={f.iid}
          onChange={(event) => {
            const c2 = byId.get(event.target.value);
            const patch: Partial<Form> = { iid: event.target.value };
            if (c2) {
              if (!f.acct || (gc && f.acct === gc.investment.profitAccountId)) patch.acct = c2.investment.profitAccountId ?? f.acct;
              if (f.what === "PROFIT" && c2.per && (!f.amount || (gc && parseTyped(f.amount) === gc.per))) patch.amount = groupTyped(String(c2.per));
            }
            setErrors({});
            setF({ ...f, ...patch });
          }}
          className={cn(INPUT, edge(errors.iid), selectClass, !f.iid && "text-ink-faint")}
        >
          <option value="" disabled>
            {t("Pick an investment")}
          </option>
          {choosable.map((c) => (
            <option key={c.investment.id} value={c.investment.id}>
              {c.investment.name}
            </option>
          ))}
        </select>
        {gc && (
          <span data-i18n-skip="" className="text-[12.5px] text-ink-muted">
            {gc.per
              ? t("Capital {capital} · profit so far {profit} · expected {each} each time", { capital: money(gc.capital), profit: money(gc.profit), each: money(gc.per) })
              : t("Capital {capital} · profit so far {profit}", { capital: money(gc.capital), profit: money(gc.profit) })}
          </span>
        )}
        <Err>{errors.iid}</Err>
      </label>
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className={LBL}>{t("Amount")}</span>
          <TakaInput symbol={currencySymbol(currency, fmt)} value={f.amount} onChange={(v) => put({ amount: groupTyped(v) }, ["amt"])} wrong={errors.amt} onEnter={() => void save()} />
          <Err>{errors.amt}</Err>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className={LBL}>{t("Date")}</span>
          <input type="date" max={today} value={f.date} onChange={(e) => put({ date: e.target.value }, ["d"])} className={cn(INPUT, edge(errors.d))} />
          <Err>{errors.d}</Err>
        </label>
      </div>
      {hasAcct && (
        <label className="flex flex-col gap-1.5">
          <span className={LBL}>{t(ACCOUNT_LABELS[f.what])}</span>
          <select value={f.acct} onChange={(e) => put({ acct: e.target.value }, ["acct"])} className={cn(INPUT, edge(errors.acct), selectClass, !f.acct && "text-ink-faint")}>
            <option value="" disabled>
              {t("Pick an account")}
            </option>
            {accountOptions.map((w) => (
              <option key={w.id} value={w.id}>
                {walletLabel(w.name, signedMoney(Number(w.currentBalance)))}
              </option>
            ))}
          </select>
          <Err>{errors.acct}</Err>
        </label>
      )}
      <label className="flex flex-col gap-1.5">
        <span className={LBL}>
          {t("Note")} <span className="font-normal text-ink-faint">{t("(optional)")}</span>
        </span>
        <input type="text" maxLength={120} value={f.note} onChange={(e) => put({ note: e.target.value })} onKeyDown={onEnter} placeholder={t(NOTE_HINTS[f.what])} className={cn(INPUT, "border-input")} />
      </label>
      {preview.length > 0 && (
        <div aria-live="polite" className="flex flex-col gap-2 rounded-[14px] border border-line bg-strip px-3.5 py-3 text-[13px] tabular-nums">
          <span className="text-[11.5px] font-semibold tracking-[0.04em] text-ink-muted uppercase">{t("After you save")}</span>
          {preview.map((p) => (
            <div key={p.label} className="flex min-h-[17px] justify-between gap-2.5">
              <span data-i18n-skip="" className="truncate text-ink-2">
                {p.label}
              </span>
              <span className="whitespace-nowrap">
                <span className="text-ink-muted">{p.from} → </span>
                <b className={p.tone}>{p.to}</b>
              </span>
            </div>
          ))}
        </div>
      )}
    </IvDialog>
  );
}
