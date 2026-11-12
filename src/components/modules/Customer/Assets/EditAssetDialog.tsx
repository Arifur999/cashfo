"use client";

import { Info, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import Loader from "@/components/shared/Loader";
import type { Account, Asset, AssetCategoryOption } from "@/lib/customer/api";
import { updateAssetAction, type UpdateAssetInput } from "@/lib/customer/assetActions";
import { isActiveCategory, updateCount } from "@/lib/customer/assetDisplay";
import { dateProblem, firstUpdateDay, nameProblem, NAME_MAX, NOTE_MAX, parseAmount, type Problem } from "@/lib/customer/assetForm";
import { currencySymbol } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { getAppToday } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { assetLook, AssetTile } from "./assetLook";
import { doneToast, FIELD, FieldError, fieldEdge, SourceToggle } from "./assetUi";
import { offeredWallets, walletBalance } from "./walletOptions";

interface EditAssetDialogProps {
  asset: Asset | null;
  onClose: () => void;
  onSaved: () => void;
  businessId: string;
  assets: Asset[];
  categories: AssetCategoryOption[];
  wallets: Account[];
  currency: string;
}

type Field = "name" | "cat" | "date" | "cost" | "acct";
const LBL = "text-[13px] font-semibold text-ink-2";

// What the purchase was, as the edit sends it back on Undo.
export const purchaseOf = (asset: Asset): UpdateAssetInput => ({
  name: asset.name,
  category: asset.category,
  purchaseDate: asset.purchaseDate.slice(0, 10),
  purchasePrice: Number(asset.purchasePrice),
  purchaseAccountId: asset.purchaseAccountId,
  notes: asset.notes,
});

// All Assets › Edit asset: a wrong name, category, price, day or wallet set
// right (or an asset bought from a wallet turned into one already owned).
// The backend voids the old purchase and posts the new one.
export function EditAssetDialog({ asset, onClose, onSaved, businessId, assets, categories, wallets, currency }: EditAssetDialogProps) {
  const { t, fmt } = useLocale();
  const [form, setForm] = useState({ bought: true, name: "", category: "", date: "", cost: "", walletId: "", note: "" });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [isSaving, startSave] = useTransition();

  const [prevAsset, setPrevAsset] = useState<Asset | null>(null);
  if (asset !== prevAsset) {
    setPrevAsset(asset);
    if (asset) {
      setForm({ bought: !!asset.purchaseAccountId, name: asset.name, category: asset.category, date: asset.purchaseDate.slice(0, 10), cost: String(Number(asset.purchasePrice)), walletId: asset.purchaseAccountId ?? "", note: asset.notes ?? "" });
      setErrors({});
    }
  }

  if (!asset) return <Dialog open={false} />;
  const look = assetLook(categories, form.category || asset.category);
  const say = (problem: Problem) => t(problem.key, problem.values);
  const money = (value: number) => walletBalance(value, currency, fmt);
  // What a wallet could pay: its balance, plus this purchase's price when it
  // already paid it (the correction gives that back first).
  const available = (wallet: Account) => Number(wallet.currentBalance) + (asset.purchaseAccountId === wallet.id ? Number(asset.purchasePrice) : 0);
  const set = (patch: Partial<typeof form>) => {
    setForm((current) => ({ ...current, ...patch }));
    setErrors({});
  };
  const updates = updateCount(asset);
  const info = [
    updates > 0 ? t(updates === 1 ? "Its {count} value update stays as it is." : "Its {count} value updates stay as they are.", { count: formatCount(updates, fmt) }) : "",
    asset.status === "SOLD" ? t("To change the sale, edit it in Purchase & Sell.") : "",
  ].filter(Boolean);
  const shownDay = (day: string) => formatDate(`${day}T00:00:00.000Z`, "d MMM yyyy", fmt);

  function save() {
    if (!asset) return;
    const next: Partial<Record<Field, string>> = {};
    const cost = parseAmount(form.cost, t("Price"));
    const named = nameProblem(form.name, assets, asset.id);
    if (named) next.name = say(named);
    if (!categories.some((option) => option.name === form.category) && form.category !== asset.category) next.cat = t("Pick a category.");
    const dated = dateProblem(form.date, getAppToday());
    const firstUpdate = firstUpdateDay(asset);
    if (dated) next.date = say(dated);
    else if (firstUpdate && form.date > firstUpdate) next.date = t("It can’t be after the first value update ({date}).", { date: shownDay(firstUpdate) });
    else if (asset.soldAt && form.date > asset.soldAt.slice(0, 10)) next.date = t("It can’t be after the sale date ({date}).", { date: shownDay(asset.soldAt.slice(0, 10)) });
    if ("problem" in cost) next.cost = say(cost.problem);
    const wallet = wallets.find((item) => item.id === form.walletId) ?? null;
    if (form.bought && !wallet) next.acct = t("Pick the account it was paid from.");
    if (!next.cost && !next.acct && form.bought && wallet && "value" in cost && cost.value > available(wallet)) next.cost = t("{wallet} has only {amount}.", { wallet: wallet.name, amount: money(available(wallet)) });
    setErrors(next);
    if (Object.keys(next).length > 0 || !("value" in cost)) return;
    const before = purchaseOf(asset);
    const input: UpdateAssetInput = { name: form.name.trim(), category: form.category, purchaseDate: form.date, purchasePrice: cost.value, purchaseAccountId: form.bought ? form.walletId : null, notes: form.note.trim() || null };
    const id = asset.id;
    startSave(async () => {
      try {
        const result = await updateAssetAction(businessId, id, input);
        if (!result.success) {
          toast.error(t(result.message ?? "Failed to save the changes"));
          return;
        }
        onClose();
        onSaved();
        doneToast(t("Saved changes to {name}", { name: input.name ?? "" }), {
          label: t("Undo"),
          run: async () => {
            const back = await updateAssetAction(businessId, id, before);
            if (back.success) onSaved();
            else toast.error(t(back.message ?? "Failed to save the changes"));
          },
        });
      } catch {
        toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
      }
    });
  }

  const enter = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      save();
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !next && !isSaving && onClose()}>
      <DialogContent showCloseButton={false} onOpenAutoFocus={(event) => event.preventDefault()} className="flex max-h-[calc(100dvh-32px)] w-140 max-w-[calc(100vw-32px)] flex-col gap-0 overflow-hidden rounded-[20px] border-0 bg-surface p-0 leading-[normal] text-ink shadow-overlay ring-0 sm:max-w-[calc(100vw-32px)]">
        <div className="flex items-center gap-3 border-b border-head-rule pt-4 pr-5 pb-3.5 pl-6">
          <AssetTile look={look} glossy className="size-10 rounded-[12px]" glyph={22} stroke={1.6} fill={0.26} />
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <DialogTitle className="text-[18px] font-bold text-ink">{t("Edit asset")}</DialogTitle>
            <DialogDescription className="text-[12.5px] text-ink-muted">{t("Fix a wrong name, price, date or account.")}</DialogDescription>
          </span>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-soft hover:bg-line">
            <X className="size-4.25" strokeWidth={2.25} aria-hidden="true" />
          </button>
        </div>
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-6 py-4.5">
          <SourceToggle
            compact
            value={form.bought ? "bought" : "owned"}
            label={t("How did you get it?")}
            onChange={(next) => set({ bought: next === "bought" })}
            options={[
              { value: "bought", label: t("I bought it"), sub: t("Paid from an account") },
              { value: "owned", label: t("I already owned it"), sub: t("No money moved") },
            ]}
          />
          <label className="flex flex-col gap-1.5">
            <span className={LBL}>{t("Asset name")}</span>
            <input type="text" maxLength={NAME_MAX} value={form.name} onChange={(event) => set({ name: event.target.value })} onKeyDown={enter} className={cn(FIELD, fieldEdge(!!errors.name))} />
            {errors.name && <FieldError>{errors.name}</FieldError>}
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LBL}>{t("Category")}</span>
            <select value={form.category} onChange={(event) => set({ category: event.target.value })} className={cn(FIELD, "cursor-pointer px-2.5", fieldEdge(!!errors.cat))}>
              <option value="" disabled>
                {t("Select a category")}
              </option>
              {categories
                .filter((option) => isActiveCategory(option) || option.name === form.category)
                .map((option) => (
                  <option key={option.id} value={option.name}>
                    {t(option.name)}
                  </option>
                ))}
              {!categories.some((option) => option.name === asset.category) && <option value={asset.category}>{asset.category}</option>}
            </select>
            {errors.cat && <FieldError>{errors.cat}</FieldError>}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={LBL}>{t(form.bought ? "Purchase date" : "Date you got it")}</span>
              <input type="date" max={getAppToday()} value={form.date} onChange={(event) => set({ date: event.target.value })} className={cn(FIELD, "px-2.5", fieldEdge(!!errors.date))} />
              {errors.date && <FieldError>{errors.date}</FieldError>}
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={LBL}>{t(form.bought ? "Price you paid" : "Value then")}</span>
              <span className={cn("flex h-11 items-center gap-1.5 rounded-[10px] border bg-surface px-3 focus-within:border-emerald focus-within:shadow-[0_0_0_3px_rgba(28,117,103,0.15)]", fieldEdge(!!errors.cost))}>
                <span aria-hidden="true" className="text-[14px] font-semibold text-ink-faint">
                  {currencySymbol(currency, fmt)}
                </span>
                <input type="text" inputMode="decimal" value={form.cost} onChange={(event) => set({ cost: event.target.value })} onKeyDown={enter} className="min-w-0 flex-1 border-0 bg-transparent text-[14px] font-semibold text-ink tabular-nums outline-none" />
              </span>
              {errors.cost && <FieldError>{errors.cost}</FieldError>}
            </label>
          </div>
          {form.bought && (
            <label className="flex flex-col gap-1.5">
              <span className={LBL}>{t("Paid from")}</span>
              <select value={form.walletId} onChange={(event) => set({ walletId: event.target.value })} className={cn(FIELD, "cursor-pointer px-2.5", fieldEdge(!!errors.acct))}>
                <option value="" disabled>
                  {t("Select an account")}
                </option>
                {offeredWallets(wallets, asset.purchaseAccountId).map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {`${wallet.name} · ${money(available(wallet))}`}
                  </option>
                ))}
              </select>
              {errors.acct && <FieldError>{errors.acct}</FieldError>}
            </label>
          )}
          <label className="flex flex-col gap-1.5">
            <span className={LBL}>{t("Note (optional)")}</span>
            <textarea rows={2} maxLength={NOTE_MAX} value={form.note} onChange={(event) => set({ note: event.target.value })} className="min-h-15 resize-y rounded-[10px] border border-input px-3 py-2.5 text-[14px] leading-normal text-ink outline-none focus:border-emerald focus:shadow-[0_0_0_3px_rgba(28,117,103,0.15)]" />
          </label>
          {info.length > 0 && (
            <div className="flex gap-2.5 rounded-[12px] bg-pick-wash px-3 py-2.5 text-[12.5px] leading-normal text-note-ink">
              <Info className="mt-px size-4 shrink-0 text-emerald" aria-hidden="true" />
              <span>{info.join(" ")}</span>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2.5 border-t border-head-rule bg-strip px-6 py-3.5">
          <button type="button" onClick={onClose} disabled={isSaving} className="h-11 rounded-full border border-input bg-surface px-4.5 text-[14px] font-semibold text-ink hover:bg-surface-sunken">
            {t("Cancel")}
          </button>
          <button type="button" onClick={save} disabled={isSaving} className="flex h-11 items-center gap-2 rounded-full bg-emerald px-5.5 text-[14px] font-semibold text-white hover:bg-emerald-hover">
            {isSaving && <Loader size={16} onDark label={t("Saving...")} />}
            {t("Save changes")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
