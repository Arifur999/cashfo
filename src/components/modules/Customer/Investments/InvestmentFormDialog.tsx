"use client";

import { useState } from "react";
import { currencySymbol } from "@/lib/customer/currency";
import { addMonths, dayOf, FREQUENCIES, FREQUENCY, groupTyped, guessKind, KINDS, parseTyped, percentText, perPayout } from "@/lib/customer/investmentDisplay";
import type { InvestmentFrequency, InvestmentInput, InvestmentKind } from "@/lib/customer/investmentTypes";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BTN_GHOST, BTN_PRIMARY, FREQUENCY_WORDS, Glyph, IC, KIND_LOOK } from "./investmentLook";
import { useInvestments } from "./InvestmentsProvider";
import { edge, Err, INPUT, IvDialog, LBL, LinkButton, Pill, TakaInput, walletLabel } from "./ivUi";

interface Form {
  step: 1 | 2;
  name: string;
  kind: InvestmentKind;
  kindTouched: boolean;
  amount: string;
  start: string;
  // "acct": paid from a wallet now; "owned": put in earlier, no account changes.
  src: "acct" | "owned";
  acct: string;
  freq: InvestmentFrequency;
  unit: "tk" | "pct";
  each: string;
  firstDue: string;
  fdTouched: boolean;
  acctIn: string;
  inTouched: boolean;
  maturity: string;
  note: string;
  org: string;
  chSrc: boolean;
  chFd: boolean;
  chIn: boolean;
  chType: boolean;
  chMore: boolean;
}

type Field = "name" | "amt" | "start" | "acct" | "each" | "firstDue" | "maturity" | "acctIn";

const SHUT = { chSrc: false, chFd: false, chIn: false, chType: false, chMore: false };

// New investment and Edit investment, in two short steps: where the money
// went, how much, when and from which wallet; then how profit comes, where
// it comes in, the kind and an end date or note (the InvestApp board's form).
export function InvestmentFormDialog({ open, onClose, onSave, busy }: { open: { id: string | null } | null; onClose: () => void; onSave: (input: InvestmentInput) => Promise<boolean>; busy: boolean }) {
  const { t, fmt } = useLocale();
  const { byId, openWallets, wallets, today, money, day, currency, walletName } = useInvestments();
  const [f, setF] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  const [prevOpen, setPrevOpen] = useState<typeof open>(null);
  if (open !== prevOpen) {
    setPrevOpen(open);
    setErrors({});
    if (!open) setF(null);
    else {
      const editing = open.id ? byId.get(open.id)?.investment : null;
      if (editing) {
        const first = editing.entries.find((e) => e.type === "INVEST");
        const rate = editing.payoutMode === "RATE";
        setF({
          step: 1,
          name: editing.name,
          kind: editing.kind,
          kindTouched: true,
          amount: groupTyped(String(Number(first?.amount ?? 0))),
          start: dayOf(editing.startDate),
          src: first?.accountId ? "acct" : "owned",
          acct: first?.accountId ?? "",
          freq: editing.frequency,
          unit: rate ? "pct" : "tk",
          each: rate ? String(Number(editing.ratePercent ?? 0) || "") : editing.payoutMode === "FIXED" ? groupTyped(String(Number(editing.fixedAmount ?? 0))) : "",
          firstDue: dayOf(editing.firstDueDate),
          fdTouched: !!editing.firstDueDate,
          acctIn: editing.profitAccountId ?? "",
          inTouched: true,
          maturity: dayOf(editing.maturityDate),
          note: editing.note ?? "",
          org: editing.organisation ?? "",
          ...SHUT,
        });
      } else {
        setF({ step: 1, name: "", kind: "OTHER", kindTouched: false, amount: "", start: today, src: "acct", acct: "", freq: "MONTHLY", unit: "tk", each: "", firstDue: "", fdTouched: false, acctIn: "", inTouched: false, maturity: "", note: "", org: "", ...SHUT });
      }
    }
  }

  if (!open || !f) return <IvDialog open={false} onClose={onClose} width={600} title="" footer={null}>{null}</IvDialog>;

  const editing = !!open.id;
  const put = (patch: Partial<Form>, clear: Field[] = []) => {
    setF({ ...f, ...patch });
    if (clear.length) setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !clear.includes(key as Field))));
  };
  const symbol = currencySymbol(currency, fmt);
  const firstWallet = openWallets[0]?.id ?? "";
  const srcKey = f.src === "acct" ? f.acct || firstWallet : "";
  const inKey = f.inTouched ? f.acctIn : f.acctIn || srcKey || firstWallet;
  const { step, perYear } = FREQUENCY[f.freq];
  const fd = f.fdTouched ? f.firstDue : step && f.start ? addMonths(f.start, step) : "";
  const amountN = parseTyped(f.amount);
  const eachN = parseTyped(f.each);
  const isPct = f.unit === "pct";
  const mode = !step || !(eachN > 0) ? "NONE" : isPct ? "RATE" : "FIXED";
  const perN = perPayout(f.freq, f.unit, eachN, amountN);
  const kindNow = f.kindTouched ? f.kind : guessKind(f.name);
  const balanceOf = (id: string) => Number(wallets.find((w) => w.id === id)?.currentBalance ?? 0);
  const balanceText = (id: string) => {
    const b = balanceOf(id);
    return `${b < 0 ? "– " : ""}${money(Math.abs(b))}`;
  };
  const freqWords = FREQUENCY_WORDS[f.freq];

  const summary = !(amountN > 0)
    ? t("Enter the amount to see what you can expect.")
    : !step
      ? t("You put in {amount}. Profit is not fixed, so record it each time it comes.", { amount: money(amountN) })
      : perN
        ? t("You put in {amount} and expect {each} {per}, about {yearly} a year ({rate}).", { amount: money(amountN), each: money(perN), per: t(freqWords.each), yearly: money(perN * perYear), rate: percentText(((perN * perYear) / amountN) * 100) })
        : t("You put in {amount}. Profit comes {freq}. Leave the amount empty if it changes each time.", { amount: money(amountN), freq: t(freqWords.label).toLowerCase() });

  let warn = "";
  if (srcKey && amountN > 0 && !editing && amountN > balanceOf(srcKey)) {
    warn = t("This is more than the {account} balance ({balance}). It will go below zero.", { account: walletName(srcKey), balance: balanceText(srcKey) });
  }

  const check1 = () => {
    const e: Partial<Record<Field, string>> = {};
    if (!f.name.trim()) e.name = t("Write where the money went.");
    if (!(amountN > 0)) e.amt = t("Enter the amount.");
    else if (amountN > 1e11) e.amt = t("The amount is too large.");
    if (!f.start) e.start = t("Pick a date.");
    else if (f.start > today) e.start = t("The date cannot be in the future.");
    if (f.src === "acct" && !srcKey) e.acct = t('Add an account in Balance first, or pick "Invested earlier".');
    return e;
  };

  const save = async () => {
    const e = check1();
    if (Object.keys(e).length) {
      put({ step: 1, chSrc: f.chSrc || !!e.acct });
      setErrors(e);
      return;
    }
    if (step) {
      if (f.each && !(eachN > 0)) e.each = t("Enter a number, or leave it empty.");
      else if (isPct && eachN > 100) e.each = t("A yearly rate goes up to 100%.");
      if (!fd) e.firstDue = t("Pick the first profit date.");
      else if (fd <= f.start) e.firstDue = t("The first profit comes after the date you invested.");
    }
    if (f.maturity && f.maturity <= f.start) e.maturity = t("This comes after the date you invested.");
    if (!inKey) e.acctIn = t("Pick where the profit comes in.");
    if (Object.keys(e).length) {
      put({ chFd: f.chFd || !!e.firstDue, chMore: f.chMore || !!e.maturity, chIn: f.chIn || !!e.acctIn });
      setErrors(e);
      return;
    }
    await onSave({
      name: f.name.trim(),
      organisation: f.org.trim() || null,
      kind: kindNow,
      amount: Math.round(amountN * 100) / 100,
      startDate: f.start,
      sourceAccountId: srcKey || null,
      frequency: f.freq,
      payoutMode: mode,
      fixedAmount: mode === "FIXED" ? Math.round(eachN * 100) / 100 : null,
      ratePercent: mode === "RATE" ? Math.round(eachN * 100) / 100 : null,
      firstDueDate: step ? fd : null,
      maturityDate: f.maturity || null,
      profitAccountId: inKey,
      note: f.note.trim() || null,
    });
  };

  const next = () => {
    const e = check1();
    if (Object.keys(e).length) {
      put({ chSrc: f.chSrc || !!e.acct });
      setErrors(e);
      return;
    }
    setErrors({});
    put({ step: 2 });
  };

  const moreBits = [f.org.trim(), f.maturity ? t("Ends {date}", { date: day(f.maturity) }) : "", f.note.trim() ? t("Note added") : ""].filter(Boolean);
  const s1 = f.step === 1;
  const walletPills = (current: string, pick: (id: string) => void) =>
    openWallets.map((w) => (
      <Pill key={w.id} on={current === w.id} onClick={() => pick(w.id)}>
        <span data-i18n-skip="">{walletLabel(w.name, balanceText(w.id))}</span>
      </Pill>
    ));
  const row = "flex min-h-[49px] items-center gap-2.5 border-b border-head-rule px-3.5";

  return (
    <IvDialog
      open
      onClose={onClose}
      width={600}
      bodyPad="py-5"
      title={editing ? t("Edit investment") : t("New investment")}
      sub={s1 ? t("Step 1 of 2") : t("Step 2 of 2 · Profit")}
      footer={
        <>
          <span className="grow" />
          <button type="button" onClick={s1 ? onClose : () => put({ step: 1 })} className={BTN_GHOST}>
            {s1 ? t("Cancel") : t("Back")}
          </button>
          <button type="button" disabled={busy} onClick={s1 ? next : () => void save()} className={cn(BTN_PRIMARY, "h-11 px-5.5")}>
            {s1 ? t("Next") : editing ? t("Save changes") : t("Add investment")}
          </button>
        </>
      }
    >
      {s1 ? (
        <>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className={LBL}>{t("Where did the money go?")}</span>
            <input type="text" maxLength={60} value={f.name} onChange={(e) => put({ name: e.target.value }, ["name"])} placeholder={t("Like Karim Garments or Prime Bank FDR")} className={cn(INPUT, edge(errors.name))} />
            <Err>{errors.name}</Err>
          </label>
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={LBL}>{t("How much?")}</span>
              <TakaInput symbol={symbol} value={f.amount} onChange={(v) => put({ amount: groupTyped(v) }, ["amt"])} wrong={errors.amt} />
              <Err>{errors.amt}</Err>
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={LBL}>{t("When?")}</span>
              <input type="date" max={today} value={f.start} onChange={(e) => put({ start: e.target.value }, ["start"])} className={cn(INPUT, edge(errors.start))} />
              <Err>{errors.start}</Err>
            </label>
          </div>
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13.5px] text-ink-2">
              <span>
                {t("Money came from@@investment")}{" "}
                <b data-i18n-skip="" className="font-semibold text-ink">
                  {f.src === "acct" ? (srcKey ? walletName(srcKey) : t("no account yet")) : t("earlier, no account changes")}
                </b>
              </span>
              <LinkButton onClick={() => put({ chSrc: !f.chSrc })} expanded={f.chSrc || !!errors.acct}>
                {t("Change")}
              </LinkButton>
            </div>
            {(f.chSrc || !!errors.acct) && (
              <div role="radiogroup" aria-label={t("Where the money came from")} className="flex flex-wrap gap-2">
                {walletPills(f.src === "acct" ? srcKey : "", (id) => put({ src: "acct", acct: id, chSrc: false }, ["acct"]))}
                <Pill on={f.src === "owned"} onClick={() => put({ src: "owned", chSrc: false }, ["acct"])}>
                  {t("Invested earlier · no account changes")}
                </Pill>
              </div>
            )}
            <Err>{errors.acct}</Err>
            {warn && (
              <span data-i18n-skip="" className="text-[12.5px] text-warning">
                {warn}
              </span>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <span className={LBL}>{t("How often does profit come?")}</span>
            <div role="radiogroup" aria-label={t("How often does profit come?")} className="flex flex-wrap gap-2">
              {FREQUENCIES.map((k) => (
                <Pill key={k} on={f.freq === k} onClick={() => put({ freq: k, ...(f.fdTouched ? {} : { firstDue: "" }) }, ["each", "firstDue"])}>
                  {t(FREQUENCY_WORDS[k].label)}
                </Pill>
              ))}
            </div>
          </div>
          {step > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className={LBL}>
                {t("How much each time?")} <span className="font-normal text-ink-faint">{t("(optional)")}</span>
              </span>
              <div className="flex items-stretch gap-2">
                <span className={cn(INPUT, edge(errors.each), "flex grow items-center gap-1.5")}>
                  {!isPct && (
                    <span aria-hidden="true" className="text-[15px] font-semibold text-ink-faint">
                      {symbol.trim()}
                    </span>
                  )}
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label={t("How much each time?")}
                    value={f.each}
                    onChange={(e) => put({ each: isPct ? e.target.value.replace(/[^\d.০-৯]/g, "") : groupTyped(e.target.value) }, ["each"])}
                    placeholder={isPct ? "12" : t("e.g. 15,000")}
                    className="min-w-0 grow border-0 bg-transparent text-[15px] font-semibold text-ink tabular-nums outline-none placeholder:font-normal placeholder:text-ink-faint"
                  />
                  {isPct && <span className="text-[13px] whitespace-nowrap text-ink-muted">{t("a year@@rate")}</span>}
                </span>
                <div role="radiogroup" aria-label={t("Amount or yearly rate")} className="flex rounded-[12px] bg-quiet-chip p-0.75">
                  {(["tk", "pct"] as const).map((u) => {
                    const on = f.unit === u;
                    return (
                      <button
                        key={u}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => put({ unit: u, each: u === "tk" ? groupTyped(f.each) : f.each.replace(/,/g, "") }, ["each"])}
                        className={cn("h-10 min-w-11 rounded-[9px] px-3 text-[14px] font-bold focus-visible:outline-2 focus-visible:outline-(--focus-ring)", on ? "bg-surface text-ink shadow-[0_1px_2px_rgba(18,32,29,0.12)]" : "bg-transparent text-ink-muted")}
                      >
                        {u === "tk" ? symbol.trim() : "%"}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Err>{errors.each}</Err>
            </div>
          )}
          <div aria-live="polite" className="flex items-start gap-2.5 rounded-[14px] border border-mint-200 bg-pick-wash px-3.5 py-3">
            <Glyph d={IC.trend} className="mt-0.5 text-emerald" />
            <span data-i18n-skip="" className="text-[13px] leading-[1.5] text-brand-ink">
              {summary}
            </span>
          </div>
          <div className="flex flex-col rounded-[14px] border border-line">
            {step > 0 && (
              <>
                <div className={row}>
                  <span className="shrink-0 text-[13px] text-ink-muted">{t("First profit")}</span>
                  <span data-i18n-skip="" className="min-w-0 grow truncate text-right text-[13.5px] font-semibold text-ink">
                    {fd ? day(fd) : t("Pick a date")}
                  </span>
                  <LinkButton onClick={() => put({ chFd: !f.chFd })} expanded={f.chFd}>
                    {t("Change")}
                  </LinkButton>
                </div>
                {f.chFd && (
                  <div className="px-3.5 pt-2 pb-3">
                    <input type="date" aria-label={t("First profit")} value={fd} onChange={(e) => put({ firstDue: e.target.value, fdTouched: true }, ["firstDue"])} className={cn(INPUT, edge(errors.firstDue), "max-w-60")} />
                  </div>
                )}
                <Err className="px-3.5 pb-2.5">{errors.firstDue}</Err>
              </>
            )}
            <div className={row}>
              <span className="shrink-0 text-[13px] text-ink-muted">{t("Profit comes into")}</span>
              <span data-i18n-skip="" className="min-w-0 grow truncate text-right text-[13.5px] font-semibold text-ink">
                {inKey ? walletName(inKey) : t("Pick an account")}
              </span>
              <LinkButton onClick={() => put({ chIn: !f.chIn })} expanded={f.chIn}>
                {t("Change")}
              </LinkButton>
            </div>
            {f.chIn && (
              <div role="radiogroup" aria-label={t("Profit comes into")} className="flex flex-wrap gap-2 px-3.5 pt-2 pb-3">
                {walletPills(inKey, (id) => put({ acctIn: id, inTouched: true, chIn: false }, ["acctIn"]))}
              </div>
            )}
            <Err className="px-3.5 pb-2.5">{errors.acctIn}</Err>
            <div className={row}>
              <span className="shrink-0 text-[13px] text-ink-muted">{t("Kind")}</span>
              <span className="min-w-0 grow truncate text-right text-[13.5px] font-semibold text-ink">{t(KIND_LOOK[kindNow].label)}</span>
              <LinkButton onClick={() => put({ chType: !f.chType })} expanded={f.chType}>
                {t("Change")}
              </LinkButton>
            </div>
            {f.chType && (
              <div role="radiogroup" aria-label={t("Kind")} className="flex flex-wrap gap-2 px-3.5 pt-2 pb-3">
                {KINDS.map((k) => (
                  <Pill key={k} on={kindNow === k} onClick={() => put({ kind: k, kindTouched: true, chType: false })}>
                    {t(KIND_LOOK[k].label)}
                  </Pill>
                ))}
              </div>
            )}
            <div className={cn(row, "border-b-0")}>
              <span className="shrink-0 text-[13px] text-ink-muted">{t("End date, note")}</span>
              <span data-i18n-skip="" className="min-w-0 grow truncate text-right text-[13.5px] font-semibold text-ink">
                {moreBits.length ? moreBits.join(" · ") : t("None")}
              </span>
              <LinkButton onClick={() => put({ chMore: !f.chMore })} expanded={f.chMore}>
                {f.chMore ? t("Hide") : moreBits.length ? t("Change") : t("Add")}
              </LinkButton>
            </div>
            {f.chMore && (
              <div className="flex flex-col gap-3 px-3.5 pt-0.5 pb-3.5">
                <label className="flex flex-col gap-1.5">
                  <span className={LBL}>
                    {t("Company, bank or person")} <span className="font-normal text-ink-faint">{t("(optional)")}</span>
                  </span>
                  <input type="text" maxLength={80} value={f.org} onChange={(e) => put({ org: e.target.value })} placeholder={t("Like Karim Garments Ltd, Narayanganj")} className={cn(INPUT, "border-input")} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={LBL}>{t("Ends or matures on")}</span>
                  <input type="date" value={f.maturity} onChange={(e) => put({ maturity: e.target.value }, ["maturity"])} className={cn(INPUT, edge(errors.maturity), "max-w-60")} />
                  <Err>{errors.maturity}</Err>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={LBL}>{t("Note")}</span>
                  <input type="text" maxLength={140} value={f.note} onChange={(e) => put({ note: e.target.value })} placeholder={t("Deed number, terms, anything to remember")} className={cn(INPUT, "border-input")} />
                </label>
              </div>
            )}
          </div>
        </>
      )}
    </IvDialog>
  );
}
