"use client";

import { Info, Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import Loader from "@/components/shared/Loader";
import type { Account, Asset, AssetCategoryOption } from "@/lib/customer/api";
import { createAssetCategoryAction, purchaseAssetAction } from "@/lib/customer/assetActions";
import { currencySymbol } from "@/lib/customer/currency";
import { isActiveCategory } from "@/lib/customer/assetDisplay";
import { dateProblem, nameProblem, NAME_MAX, NOTE_MAX, parseAmount, type Problem } from "@/lib/customer/assetForm";
import { getAppToday } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { ASSET_SWATCHES, assetLook, assetSoft, AssetGlyph } from "./assetLook";
import { FIELD, FieldError, fieldEdge, LABEL, pickedInk, SourceToggle } from "./assetUi";
import { offeredWallets, walletBalance } from "./walletOptions";

interface AddAssetDialogProps {
  open: boolean;
  onClose: () => void;
  // The new asset's id, to pick it out on the page.
  onAdded: (id: string) => void;
  businessId: string;
  assets: Asset[];
  categories: AssetCategoryOption[];
  wallets: Account[];
  currency: string;
}

type Source = "bought" | "owned";
type Field = "name" | "cat" | "date" | "amt" | "acct";

const BTN = "flex h-10 items-center justify-center gap-2 rounded-full px-4 text-[14px] font-semibold whitespace-nowrap";

// All Assets › Add asset: something bought now (the price leaves a wallet)
// or already owned (no money moves). The category is picked from chips,
// and a new one can be made right there.
export function AddAssetDialog({ open, onClose, onAdded, businessId, assets, categories, wallets, currency }: AddAssetDialogProps) {
  const { t, fmt } = useLocale();
  const [source, setSource] = useState<Source>("bought");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [walletId, setWalletId] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  // Categories made here, until the page reloads with them.
  const [made, setMade] = useState<AssetCategoryOption[]>([]);
  const [newCat, setNewCat] = useState<string | null>(null);
  const [newCatError, setNewCatError] = useState("");
  const [isSaving, startSave] = useTransition();
  const [isMaking, startMake] = useTransition();

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSource("bought");
      setName("");
      setCategory("");
      setDate("");
      setAmount("");
      setWalletId("");
      setNote("");
      setErrors({});
      setMade([]);
      setNewCat(null);
    }
  }

  const owned = source === "owned";
  const priceLabel = t(owned ? "Value" : "Price");
  const all = [...categories, ...made.filter((option) => !categories.some((category) => category.id === option.id))];
  const offered = all.filter(isActiveCategory);
  const say = (problem: Problem) => t(problem.key, problem.values);
  const money = (value: number) => walletBalance(value, currency, fmt);
  const parsed = parseAmount(amount, priceLabel);
  const wallet = wallets.find((item) => item.id === walletId) ?? null;
  const balance = wallet ? Number(wallet.currentBalance) : 0;
  const hint = wallet ? ("value" in parsed && parsed.value <= balance ? t("Left after this: {amount}", { amount: money(balance - parsed.value) }) : t("Balance now: {amount}", { amount: money(balance) })) : "";
  const clear = (...fields: Field[]) => setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !fields.includes(key as Field))));

  function save() {
    const next: Partial<Record<Field, string>> = {};
    const named = nameProblem(name, assets);
    if (named) next.name = say(named);
    if (!offered.some((option) => option.name === category)) next.cat = t("Pick a category.");
    const dated = dateProblem(date, getAppToday());
    if (dated) next.date = say(dated);
    if ("problem" in parsed) next.amt = say(parsed.problem);
    if (!owned) {
      if (!wallet) next.acct = t("Pick the account you paid from.");
      else if ("value" in parsed && parsed.value > balance) next.acct = t("{wallet} has only {amount}.", { wallet: wallet.name, amount: money(Math.max(0, balance)) });
    }
    setErrors(next);
    if (Object.keys(next).length > 0 || !("value" in parsed)) return;
    startSave(async () => {
      try {
        const result = await purchaseAssetAction(businessId, { name: name.trim(), category, purchaseDate: date, purchasePrice: parsed.value, ...(!owned && wallet && { purchaseAccountId: wallet.id }), ...(note.trim() && { notes: note.trim() }) });
        if (!result.success || !result.data) {
          toast.error(t(result.message ?? "Failed to add the asset"));
          return;
        }
        onAdded(result.data.id);
        onClose();
      } catch {
        toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
      }
    });
  }

  function saveCategory() {
    const trimmed = (newCat ?? "").trim();
    if (!trimmed) return setNewCatError(t("Enter a category name."));
    if (trimmed.length > 30) return setNewCatError(t("Keep it under 30 characters."));
    if (all.some((option) => [option.name, t(option.name)].some((text) => text.toLowerCase() === trimmed.toLowerCase()))) return setNewCatError(t("You already have this category."));
    startMake(async () => {
      try {
        const result = await createAssetCategoryAction(businessId, { name: trimmed, icon: "package", color: ASSET_SWATCHES[all.length % ASSET_SWATCHES.length].stored });
        if (!result.success || !result.data) {
          setNewCatError(t(result.message ?? "Failed to save the asset type"));
          return;
        }
        const option = result.data;
        setMade((current) => [...current, option]);
        setCategory(option.name);
        clear("cat");
        setNewCat(null);
      } catch {
        setNewCatError(t("Couldn't reach Smartly. Check your connection and try again."));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isSaving && onClose()}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="flex max-h-[calc(100dvh-48px)] w-150 max-w-[calc(100vw-32px)] flex-col gap-0 rounded-[20px] border-0 bg-surface p-0 leading-[normal] text-ink shadow-overlay ring-0 sm:max-w-[calc(100vw-32px)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-6 py-4.5">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-[18px] font-semibold text-ink">{t("Add asset")}</DialogTitle>
            <DialogDescription className="text-[13px] text-ink-muted">{t("Add something you own to your asset list.")}</DialogDescription>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4.5">
      <fieldset className="m-0 border-0 p-0">
        <legend className={cn(LABEL, "mb-2 p-0")}>{t("How did you get it?")}</legend>
        <SourceToggle
          value={source}
          label={t("How did you get it?")}
          onChange={(next) => {
            setSource(next);
            if (next === "owned") setWalletId("");
            clear("acct", "amt");
          }}
          options={[
            { value: "bought", label: t("I bought it now"), sub: t("Money paid from an account") },
            { value: "owned", label: t("I already own it"), sub: t("No account, no money moves") },
          ]}
        />
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="add-name" className={LABEL}>
          {t("Asset name")}
        </label>
        <input
          id="add-name"
          type="text"
          maxLength={NAME_MAX}
          autoComplete="off"
          placeholder={t("e.g. Gold ring, 22K")}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            clear("name");
          }}
          className={cn(FIELD, "px-3.5", fieldEdge(!!errors.name))}
        />
        {errors.name && <FieldError>{errors.name}</FieldError>}
      </div>

      <fieldset className="m-0 border-0 p-0">
        <legend className={cn(LABEL, "mb-2 w-full p-0")}>{t("Category")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {offered.map((option) => {
            const on = option.name === category;
            const look = assetLook(all, option.name);
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setCategory(option.name);
                  clear("cat");
                }}
                className={cn(
                  "flex h-8.5 max-w-full shrink-0 items-center gap-1.5 rounded-full pr-3 pl-2 text-[13px] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-(--focus-ring)",
                  on ? "border-[1.5px] border-emerald bg-emerald-soft font-semibold text-emerald" : "border border-line bg-surface font-medium text-ink-2 hover:bg-surface-sunken",
                )}
              >
                <span aria-hidden="true" className="flex size-5.5 shrink-0 items-center justify-center rounded-full" style={{ background: assetSoft(look.ink) }}>
                  <AssetGlyph icon={look.icon} ink={look.ink} size={13} stroke={2} />
                </span>
                <span className="truncate">{t(option.name)}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setNewCat("");
              setNewCatError("");
            }}
            className="flex h-8.5 items-center gap-1.5 rounded-full border border-dashed border-emerald bg-surface px-3 text-[13px] font-semibold whitespace-nowrap text-emerald hover:bg-emerald-soft"
          >
            <Plus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
            {t("Add category")}
          </button>
        </div>
        {errors.cat && <FieldError className="mt-1.5 block">{errors.cat}</FieldError>}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="add-date" className={LABEL}>
            {t(owned ? "Date you got it" : "Purchase date")}
          </label>
          <input
            id="add-date"
            type="date"
            max={getAppToday()}
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              clear("date");
            }}
            className={cn(FIELD, fieldEdge(!!errors.date))}
          />
          {errors.date && <FieldError>{errors.date}</FieldError>}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="add-value" className={LABEL}>
            {priceLabel}
          </label>
          <div className={cn("flex h-11 items-stretch overflow-hidden rounded-[10px] border bg-surface transition-[border-color,box-shadow] focus-within:border-emerald focus-within:shadow-[0_0_0_3px_rgba(28,117,103,0.15)]", fieldEdge(!!errors.amt))}>
            <span aria-hidden="true" className="flex w-10 shrink-0 items-center justify-center border-r border-line bg-strip text-[16px] font-semibold text-ink-soft">
              {currencySymbol(currency, fmt)}
            </span>
            <input
              id="add-value"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                clear("amt", "acct");
              }}
              className="min-w-0 flex-1 border-0 bg-transparent px-3 text-[16px] font-bold text-ink tabular-nums outline-none placeholder:text-ink-muted"
            />
          </div>
          {errors.amt && <FieldError>{errors.amt}</FieldError>}
        </div>
      </div>

      {owned ? (
        <div className="flex items-start gap-2.5 rounded-[12px] border border-line bg-strip px-3.5 py-3 text-[13px] leading-normal text-ink-soft">
          <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <span>{t("No account is used and no money moves. It goes straight to All Assets with this value.")}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="add-from" className={LABEL}>
            {t("Paid from")}
          </label>
          <select
            id="add-from"
            value={walletId}
            onChange={(event) => {
              setWalletId(event.target.value);
              clear("acct");
            }}
            className={cn(FIELD, "cursor-pointer", fieldEdge(!!errors.acct), pickedInk(!!walletId))}
          >
            <option value="" disabled>
              {t("Select an account")}
            </option>
            {offeredWallets(wallets).map((item) => (
              <option key={item.id} value={item.id} className="text-ink">
                {`${item.name} · ${money(Number(item.currentBalance))}`}
              </option>
            ))}
          </select>
          {errors.acct ? <FieldError>{errors.acct}</FieldError> : hint && <span className="text-[12px] text-ink-muted tabular-nums">{hint}</span>}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="add-details" className={LABEL}>
          {t("Note")} <span className="font-normal text-ink-muted">{t("(optional)")}</span>
        </label>
        <textarea
          id="add-details"
          rows={2}
          maxLength={NOTE_MAX}
          placeholder={t("e.g. Where it is, papers or any notes")}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="min-h-16 resize-y rounded-[10px] border border-input bg-surface px-3 py-2.5 text-[14px] leading-normal text-ink outline-none focus:border-emerald focus:shadow-[0_0_0_3px_rgba(28,117,103,0.15)]"
        />
        <span className="self-end text-[12px] text-ink-muted tabular-nums">{`${formatCount(note.length, fmt)}/${formatCount(NOTE_MAX, fmt)}`}</span>
      </div>

        </div>
        <div className="flex shrink-0 items-center justify-end gap-2.5 rounded-b-[20px] border-t border-line bg-surface px-6 py-3.5">
          <button type="button" onClick={onClose} disabled={isSaving} className={cn(BTN, "border border-input bg-surface text-ink hover:bg-surface-sunken")}>
            {t("Cancel")}
          </button>
          <button type="button" onClick={save} disabled={isSaving} className={cn(BTN, "bg-emerald px-4.5 text-white shadow-[0_1px_2px_rgba(18,32,29,0.10)] hover:bg-emerald-hover")}>
            {isSaving && <Loader size={16} onDark label={t("Saving...")} />}
            {t("Save asset")}
          </button>
        </div>
      {newCat !== null && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-[20px] bg-[rgba(18,32,29,0.35)] p-6"
          onClick={(event) => {
            if (event.target === event.currentTarget) setNewCat(null);
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="new-cat-title" className="flex w-95 flex-col rounded-[16px] bg-surface shadow-[0_18px_44px_rgba(18,32,29,0.25)]">
            <div className="flex items-center justify-between border-b border-line py-3 pr-3 pl-5">
              <h3 id="new-cat-title" className="text-[16px] font-semibold text-ink">
                {t("New category")}
              </h3>
              <button type="button" aria-label={t("Close")} onClick={() => setNewCat(null)} className="flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken">
                <X className="size-4.5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-col gap-1.5 px-5 py-4">
              <label htmlFor="new-cat-name" className={LABEL}>
                {t("Category name")}
              </label>
              <input
                id="new-cat-name"
                type="text"
                maxLength={30}
                autoComplete="off"
                autoFocus
                placeholder={t("e.g. Shares")}
                value={newCat}
                onChange={(event) => {
                  setNewCat(event.target.value);
                  setNewCatError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    saveCategory();
                  }
                }}
                className={cn(FIELD, fieldEdge(!!newCatError))}
              />
              {newCatError && <FieldError className="text-[12px]">{newCatError}</FieldError>}
            </div>
            <div className="flex justify-end gap-2 px-5 pt-3 pb-4">
              <button type="button" onClick={() => setNewCat(null)} className="h-11 rounded-full border border-input bg-surface px-4 text-[14px] font-semibold text-ink hover:bg-surface-sunken">
                {t("Cancel")}
              </button>
              <button type="button" disabled={isMaking} onClick={saveCategory} className="flex h-11 items-center gap-2 rounded-full bg-emerald px-4.5 text-[14px] font-semibold text-white hover:bg-emerald-hover">
                {isMaking && <Loader size={16} onDark label={t("Saving...")} />}
                {t("Save")}
              </button>
            </div>
          </div>
        </div>
      )}
      </DialogContent>
    </Dialog>
  );
}
