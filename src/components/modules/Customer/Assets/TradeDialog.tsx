"use client";

import { Info, X } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import Loader from "@/components/shared/Loader";
import type { Account, Asset, AssetCategoryOption } from "@/lib/customer/api";
import type { PurchaseAssetInput, SellAssetInput, UpdateAssetInput } from "@/lib/customer/assetActions";
import { isActiveCategory, updateCount } from "@/lib/customer/assetDisplay";
import { dateProblem, firstUpdateDay, lastValueDay, nameProblem, NAME_MAX, NOTE_MAX, parseAmount, type Problem } from "@/lib/customer/assetForm";
import { currencySymbol, formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { getAppToday } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { assetTone, changePercent } from "./assetLook";
import { FIELD, FieldError, fieldEdge, LABEL, MoneyField, pickedInk, SourceToggle } from "./assetUi";
import { offeredWallets, walletBalance } from "./walletOptions";

export type TradeKind = "purchase" | "sale";

// What the popup hands back: a new purchase or sale, or a correction.
export type TradeSubmit =
  | { kind: "purchase"; input: PurchaseAssetInput; owned: boolean }
  | { kind: "editPurchase"; asset: Asset; input: UpdateAssetInput }
  | { kind: "sale"; asset: Asset; input: SellAssetInput }
  | { kind: "editSale"; asset: Asset; input: SellAssetInput };

interface TradeDialogProps {
  // Closed while null; `editing` opens on that asset's purchase or sale.
  open: { kind: TradeKind; editing: Asset | null } | null;
  onClose: () => void;
  onSubmit: (submit: TradeSubmit) => void;
  busy: boolean;
  assets: Asset[];
  categories: AssetCategoryOption[];
  wallets: Account[];
  currency: string;
}

type Field = "name" | "cat" | "date" | "amt" | "acct" | "asset" | "sdate" | "samt" | "sacct";
const blankPurchase = { owned: false, name: "", category: "", date: "", amount: "", walletId: "", note: "" };
const blankSale = { assetId: "", date: "", amount: "", walletId: "", note: "" };

// Purchase & Sell's popup: record a purchase (bought now from a wallet, or
// already owned) or a sale of an active asset, or set one right.
export function TradeDialog({ open, onClose, onSubmit, busy, assets, categories, wallets, currency }: TradeDialogProps) {
  const { t, fmt } = useLocale();
  const [kind, setKind] = useState<TradeKind>("purchase");
  const [buy, setBuy] = useState(blankPurchase);
  const [sale, setSale] = useState(blankSale);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  const [prevOpen, setPrevOpen] = useState<TradeDialogProps["open"]>(null);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      const asset = open.editing;
      setKind(open.kind);
      setErrors({});
      setBuy(asset && open.kind === "purchase" ? { owned: !asset.purchaseAccountId, name: asset.name, category: asset.category, date: asset.purchaseDate.slice(0, 10), amount: String(Number(asset.purchasePrice)), walletId: asset.purchaseAccountId ?? "", note: asset.notes ?? "" } : blankPurchase);
      setSale(asset && open.kind === "sale" ? { assetId: asset.id, date: asset.soldAt?.slice(0, 10) ?? "", amount: String(Number(asset.soldPrice ?? 0)), walletId: asset.soldAccountId ?? "", note: asset.soldNote ?? "" } : blankSale);
    }
  }

  const editing = open?.editing ?? null;
  const isSale = kind === "sale";
  const money = (value: number) => formatCurrency(value, currency, fmt);
  const balanceText = (value: number) => walletBalance(value, currency, fmt);
  const shownDay = (day: string) => formatDate(`${day}T00:00:00.000Z`, "d MMM yyyy", fmt);
  const say = (problem: Problem) => t(problem.key, problem.values);
  const clear = (...fields: Field[]) => setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !fields.includes(key as Field))));
  const symbol = currencySymbol(currency, fmt);
  const today = getAppToday();

  // ---- purchase
  const priceLabel = t(buy.owned ? "Value" : "Price");
  const priceParsed = parseAmount(buy.amount, priceLabel);
  const buyWallet = wallets.find((wallet) => wallet.id === buy.walletId) ?? null;
  // What a wallet could pay: when correcting a purchase it already paid,
  // that price comes back first.
  const available = (wallet: Account) => Number(wallet.currentBalance) + (editing && !isSale && editing.purchaseAccountId === wallet.id ? Number(editing.purchasePrice) : 0);
  const buyHint = buyWallet ? ("value" in priceParsed && priceParsed.value <= available(buyWallet) ? t("Left after this: {amount}", { amount: balanceText(available(buyWallet) - priceParsed.value) }) : t("Balance now: {amount}", { amount: balanceText(available(buyWallet)) })) : "";
  const categoryOptions = categories.filter((option) => isActiveCategory(option) || option.name === editing?.category);

  function submitPurchase() {
    const next: Partial<Record<Field, string>> = {};
    const named = nameProblem(buy.name, assets, editing?.id);
    if (named) next.name = say(named);
    if (!categoryOptions.some((option) => option.name === buy.category)) next.cat = t("Pick a category.");
    const dated = dateProblem(buy.date, today);
    if (dated) next.date = say(dated);
    else if (editing) {
      const firstUpdate = firstUpdateDay(editing);
      if (firstUpdate && buy.date > firstUpdate) next.date = t("The date can’t be after the first value update ({date}).", { date: shownDay(firstUpdate) });
      else if (editing.soldAt && buy.date > editing.soldAt.slice(0, 10)) next.date = t("The date can’t be after the sale date ({date}).", { date: shownDay(editing.soldAt.slice(0, 10)) });
    }
    if ("problem" in priceParsed) next.amt = say(priceParsed.problem);
    if (!buy.owned) {
      if (!buyWallet) next.acct = t("Pick the account you paid from.");
      else if ("value" in priceParsed && priceParsed.value > available(buyWallet)) next.acct = t("{wallet} has only {amount}.", { wallet: buyWallet.name, amount: balanceText(Math.max(0, available(buyWallet))) });
    }
    setErrors(next);
    if (Object.keys(next).length > 0 || !("value" in priceParsed)) return;
    const note = buy.note.trim();
    if (editing) {
      onSubmit({ kind: "editPurchase", asset: editing, input: { name: buy.name.trim(), category: buy.category, purchaseDate: buy.date, purchasePrice: priceParsed.value, purchaseAccountId: buy.owned ? null : buy.walletId, notes: note || null } });
    } else {
      onSubmit({ kind: "purchase", owned: buy.owned, input: { name: buy.name.trim(), category: buy.category, purchaseDate: buy.date, purchasePrice: priceParsed.value, ...(!buy.owned && { purchaseAccountId: buy.walletId }), ...(note && { notes: note }) } });
    }
  }

  // ---- sale
  const activeAssets = assets.filter((asset) => asset.status === "ACTIVE").sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
  const saleList = editing && isSale ? [editing] : activeAssets;
  const picked = saleList.find((asset) => asset.id === sale.assetId) ?? null;
  // The value before the sale (the backend keeps it on a sold asset too).
  const current = picked ? Number(picked.currentValue) : 0;
  const saleParsed = parseAmount(sale.amount, t("Sale price"));
  const chip = (change: number, base: number) => ({ text: `${formatSignedCurrency(change, currency, fmt)} · ${toLocaleDigits(changePercent(change, base), fmt)}`, tone: assetTone(change) });

  function submitSale() {
    const next: Partial<Record<Field, string>> = {};
    if (!picked) next.asset = t("Pick the asset you sold.");
    else {
      const lastDay = lastValueDay(picked);
      const buyDay = picked.purchaseDate.slice(0, 10);
      const dated = dateProblem(sale.date, today, lastDay > buyDay ? { day: lastDay, name: t("the last value update"), shown: shownDay(lastDay) } : { day: buyDay, name: t("the buy date"), shown: shownDay(buyDay) });
      if (dated) next.sdate = say(dated);
    }
    if ("problem" in saleParsed) next.samt = say(saleParsed.problem);
    if (!wallets.some((wallet) => wallet.id === sale.walletId)) next.sacct = t("Pick the account the money went into.");
    setErrors(next);
    if (Object.keys(next).length > 0 || !picked || !("value" in saleParsed)) return;
    const input: SellAssetInput = { soldPrice: saleParsed.value, soldAccountId: sale.walletId, date: sale.date, ...(sale.note.trim() && { notes: sale.note.trim() }) };
    onSubmit(editing ? { kind: "editSale", asset: picked, input } : { kind: "sale", asset: picked, input });
  }

  const note = isSale ? sale.note : buy.note;
  const submitLabel = editing ? t("Save changes") : isSale ? t("Record sale") : buy.owned ? t("Add asset") : t("Save purchase");
  const tabs = [
    { value: "purchase" as const, label: t("Purchase"), sub: t("Add an asset you bought or own"), ink: "text-expense-fill", on: "border-2 border-expense-fill bg-loss-wash", icon: "M12 5v14 M19 12l-7 7-7-7" },
    { value: "sale" as const, label: t("Sale"), sub: t("Sell an active asset"), ink: "text-success", on: "border-2 border-success bg-gain-wash", icon: "M12 19V5 M5 12l7-7 7 7" },
  ];

  return (
    <Dialog open={open !== null} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="flex max-h-[calc(100dvh-48px)] w-145 max-w-[calc(100vw-32px)] flex-col gap-0 overflow-hidden rounded-[20px] border-0 bg-surface p-0 leading-[normal] text-ink shadow-overlay ring-0 sm:max-w-[calc(100vw-32px)]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line py-3.5 pr-4 pl-6">
          <DialogTitle className="text-[18px] font-semibold text-ink">{editing ? t(isSale ? "Edit sale" : "Edit purchase") : t("Record purchase or sale")}</DialogTitle>
          <DialogDescription className="sr-only">{t("Record purchase or sale")}</DialogDescription>
          <button type="button" aria-label={t("Close")} disabled={busy} onClick={onClose} className="flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-6 py-4.5">
          {!editing && (
            <div role="tablist" aria-label={t("Transaction type")} className="grid grid-cols-2 gap-2.5">
              {tabs.map((tab) => {
                const on = kind === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => {
                      setKind(tab.value);
                      setErrors({});
                    }}
                    className={cn("flex h-14 items-center justify-center gap-2 rounded-[12px] focus-visible:outline-2 focus-visible:outline-(--focus-ring)", on ? tab.on : "border border-input bg-surface hover:bg-surface-sunken")}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={tab.ink}>
                      <path d={tab.icon} />
                    </svg>
                    <span className="flex flex-col items-start">
                      <span className={cn("text-[15px] font-semibold", on ? "text-ink" : "text-ink-2")}>{tab.label}</span>
                      <span className="text-[12px] text-ink-muted">{tab.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {!isSale ? (
            <>
              <fieldset className="m-0 border-0 p-0">
                <legend className={cn(LABEL, "mb-2 p-0")}>{t("How did you get it?")}</legend>
                <SourceToggle
                  value={buy.owned ? "owned" : "bought"}
                  label={t("How did you get it?")}
                  onChange={(next) => {
                    setBuy((current) => ({ ...current, owned: next === "owned", walletId: next === "owned" ? "" : current.walletId }));
                    clear("acct", "amt");
                  }}
                  options={[
                    { value: "bought", label: t("I bought it now"), sub: t("Money paid from an account") },
                    { value: "owned", label: t("I already own it"), sub: t("No account, no money moves") },
                  ]}
                />
              </fieldset>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="at-name" className={LABEL}>
                  {t("Asset name")}
                </label>
                <input
                  id="at-name"
                  type="text"
                  maxLength={NAME_MAX}
                  autoComplete="off"
                  placeholder={t("e.g. Gold ring, 22K")}
                  value={buy.name}
                  onChange={(event) => {
                    setBuy({ ...buy, name: event.target.value });
                    clear("name");
                  }}
                  className={cn(FIELD, fieldEdge(!!errors.name))}
                />
                {errors.name && <FieldError>{errors.name}</FieldError>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="at-cat" className={LABEL}>
                  {t("Category")}
                </label>
                <select
                  id="at-cat"
                  value={buy.category}
                  onChange={(event) => {
                    setBuy({ ...buy, category: event.target.value });
                    clear("cat");
                  }}
                  className={cn(FIELD, "cursor-pointer", fieldEdge(!!errors.cat), pickedInk(!!buy.category))}
                >
                  <option value="" disabled>
                    {t("Select a category")}
                  </option>
                  {categoryOptions.map((option) => (
                    <option key={option.id} value={option.name} className="text-ink">
                      {t(option.name)}
                    </option>
                  ))}
                </select>
                {errors.cat ? <FieldError>{errors.cat}</FieldError> : <span className="text-[12px] text-ink-muted">{t("Only active categories from the Category page.")}</span>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <label htmlFor="at-date" className={LABEL}>
                    {t(buy.owned ? "Date you got it" : "Purchase date")}
                  </label>
                  <input
                    id="at-date"
                    type="date"
                    max={today}
                    value={buy.date}
                    onChange={(event) => {
                      setBuy({ ...buy, date: event.target.value });
                      clear("date");
                    }}
                    className={cn(FIELD, fieldEdge(!!errors.date))}
                  />
                  {errors.date && <FieldError>{errors.date}</FieldError>}
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <label htmlFor="at-amount" className={LABEL}>
                    {priceLabel}
                  </label>
                  <MoneyField
                    id="at-amount"
                    symbol={symbol}
                    value={buy.amount}
                    wrong={!!errors.amt}
                    onChange={(value) => {
                      setBuy({ ...buy, amount: value });
                      clear("amt", "acct");
                    }}
                  />
                  {errors.amt && <FieldError>{errors.amt}</FieldError>}
                </div>
              </div>
              {buy.owned ? (
                <div className="flex items-start gap-2.5 rounded-[12px] border border-line bg-strip px-3.5 py-3 text-[13px] leading-normal text-ink-soft">
                  <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  <span>{t("No account is used and no money moves. It goes straight to All Assets with this value, so it does not show in this list.")}</span>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="at-from" className={LABEL}>
                    {t("Paid from")}
                  </label>
                  <select
                    id="at-from"
                    value={buy.walletId}
                    onChange={(event) => {
                      setBuy({ ...buy, walletId: event.target.value });
                      clear("acct");
                    }}
                    className={cn(FIELD, "cursor-pointer", fieldEdge(!!errors.acct), pickedInk(!!buy.walletId))}
                  >
                    <option value="" disabled>
                      {t("Select an account")}
                    </option>
                    {offeredWallets(wallets, editing?.purchaseAccountId).map((wallet) => (
                      <option key={wallet.id} value={wallet.id} className="text-ink">
                        {`${wallet.name} · ${balanceText(Number(wallet.currentBalance))}`}
                      </option>
                    ))}
                  </select>
                  {errors.acct ? <FieldError>{errors.acct}</FieldError> : buyHint && <span className="text-[12px] text-ink-muted tabular-nums">{buyHint}</span>}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="at-asset" className={LABEL}>
                  {t("Asset sold")}
                </label>
                <select
                  id="at-asset"
                  value={sale.assetId}
                  disabled={!!editing}
                  onChange={(event) => {
                    setSale({ ...sale, assetId: event.target.value });
                    clear("asset", "sdate");
                  }}
                  className={cn(FIELD, "cursor-pointer", fieldEdge(!!errors.asset), pickedInk(!!sale.assetId), editing && "bg-strip")}
                >
                  <option value="" disabled>
                    {t("Select one of your active assets")}
                  </option>
                  {saleList.map((asset) => (
                    <option key={asset.id} value={asset.id} className="text-ink">
                      {`${asset.name} · ${t(asset.category)}`}
                    </option>
                  ))}
                </select>
                {errors.asset && <FieldError>{errors.asset}</FieldError>}
              </div>
              {picked && (
                <div className="grid grid-cols-2 gap-3 rounded-[12px] border border-line bg-strip px-4 py-3.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[12px] text-ink-muted">{t("What you paid")}</span>
                    <span className="text-[17px] font-bold tabular-nums">{money(Number(picked.purchasePrice))}</span>
                    <span className="text-[12px] text-ink-muted">{t("Bought {date}", { date: shownDay(picked.purchaseDate.slice(0, 10)) })}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[12px] text-ink-muted">{t("Current value")}</span>
                    <span className="text-[17px] font-bold tabular-nums">{money(current)}</span>
                    <span className="text-[12px] text-ink-muted">{updateCount(picked) ? t("Updated {date}", { date: shownDay(lastValueDay(picked)) }) : t("Not updated yet")}</span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <label htmlFor="at-sdate" className={LABEL}>
                    {t("Sale date")}
                  </label>
                  <input
                    id="at-sdate"
                    type="date"
                    min={picked?.purchaseDate.slice(0, 10)}
                    max={today}
                    value={sale.date}
                    onChange={(event) => {
                      setSale({ ...sale, date: event.target.value });
                      clear("sdate");
                    }}
                    className={cn(FIELD, fieldEdge(!!errors.sdate))}
                  />
                  {errors.sdate && <FieldError>{errors.sdate}</FieldError>}
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <label htmlFor="at-sale" className={LABEL}>
                    {t("Sale price")}
                  </label>
                  <MoneyField
                    id="at-sale"
                    symbol={symbol}
                    value={sale.amount}
                    wrong={!!errors.samt}
                    onChange={(value) => {
                      setSale({ ...sale, amount: value });
                      clear("samt");
                    }}
                  />
                  {errors.samt && <FieldError>{errors.samt}</FieldError>}
                </div>
              </div>
              {picked && "value" in saleParsed && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: t("vs what you paid"), ...chip(saleParsed.value - Number(picked.purchasePrice), Number(picked.purchasePrice)) },
                    { label: t("vs current value"), ...chip(saleParsed.value - current, current) },
                  ].map((box) => (
                    <div key={box.label} className={cn("flex flex-col gap-0.5 rounded-[10px] px-3 py-2.5", box.tone.chip)}>
                      <span className="text-[12px] text-ink-soft">{box.label}</span>
                      <span className={cn("text-[14px] font-bold tabular-nums", box.tone.ink)}>{box.text}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="at-into" className={LABEL}>
                  {t("Paid into")}
                </label>
                <select
                  id="at-into"
                  value={sale.walletId}
                  onChange={(event) => {
                    setSale({ ...sale, walletId: event.target.value });
                    clear("sacct");
                  }}
                  className={cn(FIELD, "cursor-pointer", fieldEdge(!!errors.sacct), pickedInk(!!sale.walletId))}
                >
                  <option value="" disabled>
                    {t("Select an account")}
                  </option>
                  {offeredWallets(wallets, editing?.soldAccountId).map((wallet) => (
                    <option key={wallet.id} value={wallet.id} className="text-ink">
                      {`${wallet.name} · ${balanceText(Number(wallet.currentBalance))}`}
                    </option>
                  ))}
                </select>
                {errors.sacct && <FieldError>{errors.sacct}</FieldError>}
              </div>
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="at-details" className={LABEL}>
              {t("Note")} <span className="font-normal text-ink-muted">{t("(optional)")}</span>
            </label>
            <textarea
              id="at-details"
              rows={2}
              maxLength={NOTE_MAX}
              placeholder={t(isSale ? "e.g. Sold to a colleague, papers handed over" : "e.g. Where you bought it, receipt no.")}
              value={note}
              onChange={(event) => (isSale ? setSale({ ...sale, note: event.target.value }) : setBuy({ ...buy, note: event.target.value }))}
              className="min-h-16 resize-y rounded-[10px] border border-input bg-surface px-3 py-2.5 text-[14px] leading-normal text-ink outline-none focus:border-emerald focus:shadow-[0_0_0_3px_rgba(28,117,103,0.15)]"
            />
            <span className="self-end text-[12px] text-ink-muted tabular-nums">{`${formatCount(note.length, fmt)}/${formatCount(NOTE_MAX, fmt)}`}</span>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2.5 border-t border-line px-6 py-3.5">
          <button type="button" onClick={onClose} disabled={busy} className="h-11 rounded-full border border-input bg-surface px-4.5 text-[14px] font-semibold text-ink hover:bg-surface-sunken">
            {t("Cancel")}
          </button>
          <button type="button" onClick={isSale ? submitSale : submitPurchase} disabled={busy} className="flex h-11 items-center gap-2 rounded-full bg-emerald px-5 text-[14px] font-semibold text-white shadow-[0_1px_2px_rgba(18,32,29,0.10)] hover:bg-emerald-hover">
            {busy && <Loader size={16} onDark label={t("Saving...")} />}
            {submitLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
