"use client";

import { useState } from "react";
import { currencySymbol } from "@/lib/customer/currency";
import { dayOf, groupTyped, parseTyped } from "@/lib/customer/investmentDisplay";
import type { CloseInput } from "@/lib/customer/investmentTypes";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BTN_GHOST, BTN_PRIMARY } from "./investmentLook";
import { useInvestments } from "./InvestmentsProvider";
import { edge, Err, INPUT, IvDialog, LBL, TakaInput, walletLabel } from "./ivUi";

type Field = "amt" | "d" | "acct";

// Close investment: what came back in the end. Less than the capital saves
// the rest as a loss, more saves the extra as profit (the InvestApp board).
export function CloseDialog({ id, onClose, onSave, busy }: { id: string | null; onClose: () => void; onSave: (id: string, input: CloseInput) => Promise<boolean>; busy: boolean }) {
  const { t, fmt } = useLocale();
  const { byId, openWallets, today, money, currency } = useInvestments();
  const [f, setF] = useState({ amount: "", date: "", acct: "", note: "" });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  const [prevId, setPrevId] = useState<string | null>(null);
  if (id !== prevId) {
    setPrevId(id);
    setErrors({});
    const c = id ? byId.get(id) : null;
    if (c) setF({ amount: groupTyped(String(c.capital)), date: today, acct: c.investment.profitAccountId ?? "", note: "" });
  }

  const hc = id ? byId.get(id) : null;
  if (!hc) return <IvDialog open={false} onClose={onClose} width={520} title="" footer={null}>{null}</IvDialog>;

  const amountN = parseTyped(f.amount);
  const valid = amountN >= 0;
  const diff = valid ? amountN - hc.capital : 0;
  const gain = hc.profit + (valid ? amountN : 0) + hc.back - hc.put;
  const put = (patch: Partial<typeof f>, clear: Field) => {
    setF({ ...f, ...patch });
    setErrors((current) => ({ ...current, [clear]: undefined }));
  };
  const signed = (value: number) => (value < 0 ? "– " : value > 0 ? "+ " : "") + money(Math.abs(value));

  const lines = [
    { k: t("Capital in it now"), v: money(hc.capital), tone: "text-ink" },
    { k: t("Profit received so far"), v: money(hc.profit), tone: "text-tint-green-ink" },
    {
      k: !valid ? t("Result") : diff < 0 ? t("Saved as a loss") : diff > 0 ? t("Extra saved as profit") : t("Capital back in full"),
      v: !valid ? "–" : diff ? money(Math.abs(diff)) : "✓",
      tone: diff < 0 ? "text-loss-ink" : "text-tint-green-ink",
    },
    { k: t("Total gain from this investment"), v: valid ? signed(gain) : "–", tone: gain < 0 ? "text-loss-ink" : "text-tint-green-ink" },
  ];

  const save = async () => {
    const e: Partial<Record<Field, string>> = {};
    if (!valid) e.amt = t("Enter the amount, or 0 if nothing came back.");
    else if (amountN > 1e11) e.amt = t("The amount is too large.");
    if (!f.date) e.d = t("Pick a date.");
    else if (f.date > today) e.d = t("The date cannot be in the future.");
    else if (f.date < dayOf(hc.investment.startDate)) e.d = t("This is before the investment started.");
    if (amountN > 0 && !f.acct) e.acct = t("Pick an account.");
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    const note = f.note.trim();
    await onSave(hc.investment.id, { amount: Math.round(amountN * 100) / 100, date: f.date, ...(amountN > 0 ? { accountId: f.acct } : {}), ...(note ? { note } : {}) });
  };

  return (
    <IvDialog
      open
      onClose={onClose}
      width={520}
      title={t("Close investment")}
      sub={hc.investment.name}
      footer={
        <>
          <span className="grow" />
          <button type="button" onClick={onClose} className={BTN_GHOST}>
            {t("Cancel")}
          </button>
          <button type="button" disabled={busy} onClick={() => void save()} className={cn(BTN_PRIMARY, "h-11 px-5.5")}>
            {t("Close investment")}
          </button>
        </>
      }
    >
      <p className="m-0 text-[13.5px] leading-[1.55] text-ink-2">{t("Write how much you got back in the end. If it is less than the capital, the rest is saved as a loss. If it is more, the extra counts as profit.")}</p>
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className={LBL}>{t("Money you got back")}</span>
          <TakaInput symbol={currencySymbol(currency, fmt)} value={f.amount} onChange={(v) => put({ amount: groupTyped(v) }, "amt")} wrong={errors.amt} />
          <Err>{errors.amt}</Err>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className={LBL}>{t("Date")}</span>
          <input type="date" max={today} value={f.date} onChange={(e) => put({ date: e.target.value }, "d")} className={cn(INPUT, edge(errors.d))} />
          <Err>{errors.d}</Err>
        </label>
      </div>
      {amountN > 0 && (
        <label className="flex flex-col gap-1.5">
          <span className={LBL}>{t("Money came into")}</span>
          <select value={f.acct} onChange={(e) => put({ acct: e.target.value }, "acct")} className={cn(INPUT, edge(errors.acct), "select-chevron cursor-pointer", !f.acct && "text-ink-faint")}>
            <option value="" disabled>
              {t("Pick an account")}
            </option>
            {openWallets.map((w) => (
              <option key={w.id} value={w.id}>
                {walletLabel(w.name, `${Number(w.currentBalance) < 0 ? "– " : ""}${money(Math.abs(Number(w.currentBalance)))}`)}
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
        <input type="text" maxLength={120} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} className={cn(INPUT, "border-input")} />
      </label>
      <div aria-live="polite" className="flex flex-col gap-2 rounded-[14px] border border-line bg-strip px-3.5 py-3 text-[13px] tabular-nums">
        {lines.map((line) => (
          <div key={line.k} className="flex justify-between gap-2.5">
            <span className="text-ink-2">{line.k}</span>
            <b className={cn("whitespace-nowrap", line.tone)}>{line.v}</b>
          </div>
        ))}
      </div>
    </IvDialog>
  );
}
