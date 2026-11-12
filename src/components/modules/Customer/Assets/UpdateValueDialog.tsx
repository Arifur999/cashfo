"use client";

import { X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import Loader from "@/components/shared/Loader";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import { deleteAssetValueUpdateAction, updateAssetValueAction } from "@/lib/customer/assetActions";
import { updateCount } from "@/lib/customer/assetDisplay";
import { dateProblem, lastValueDay, parseAmount, VALUE_NOTE_MAX } from "@/lib/customer/assetForm";
import { currencySymbol, formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { getAppToday } from "@/lib/date";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { assetLook, AssetTile, assetTone, changePercent } from "./assetLook";
import { doneToast, FIELD, FieldError, fieldEdge, LABEL, MoneyField } from "./assetUi";

interface UpdateValueDialogProps {
  asset: Asset | null;
  onClose: () => void;
  onSaved: () => void;
  businessId: string;
  categories: AssetCategoryOption[];
  currency: string;
}

// "Bought on 20 Aug 2024" or "Owned since 1 Nov 2023", under what was paid.
export const originText = (asset: Asset, t: (key: string, values?: Record<string, string>) => string, day: (date: string) => string) =>
  t(asset.purchaseAccountId ? "Bought on {date}" : "Owned since {date}", { date: day(asset.purchaseDate) });

// Update value: what the asset is worth now, on a day no earlier than its
// last value, with a note. The change against the current value and against
// what was paid shows as it is typed.
export function UpdateValueDialog({ asset, onClose, onSaved, businessId, categories, currency }: UpdateValueDialogProps) {
  const { t, fmt } = useLocale();
  const [value, setValue] = useState("");
  const [date, setDate] = useState(getAppToday());
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ value?: string; date?: string }>({});
  const [isSaving, startSave] = useTransition();

  const [prevAsset, setPrevAsset] = useState<Asset | null>(null);
  if (asset !== prevAsset) {
    setPrevAsset(asset);
    if (asset) {
      setValue("");
      setDate(getAppToday());
      setNote("");
      setErrors({});
    }
  }

  if (!asset) return <Dialog open={false} />;
  const look = assetLook(categories, asset.category);
  const money = (amount: number | string) => formatCurrency(amount, currency, fmt);
  const day = (iso: string) => formatDate(`${iso.slice(0, 10)}T00:00:00.000Z`, "d MMM yyyy", fmt);
  const current = Number(asset.currentValue);
  const paid = Number(asset.purchasePrice);
  const label = t("New value");
  const parsed = parseAmount(value, label);
  const shown = (change: number, base: number) => `${formatSignedCurrency(change, currency, fmt)} · ${toLocaleDigits(changePercent(change, base), fmt)}`;

  function save() {
    if (!asset) return;
    const lastDay = lastValueDay(asset);
    const dated = asset.status === "SOLD" ? { key: "This asset is sold. Its value can’t change." } : dateProblem(date, getAppToday(), { day: lastDay, name: t("the last update"), shown: day(lastDay) });
    const next = { value: "problem" in parsed ? t(parsed.problem.key, parsed.problem.values) : undefined, date: dated ? t(dated.key, dated.values) : undefined };
    setErrors(next);
    if (next.value || next.date || !("value" in parsed)) return;
    const id = asset.id;
    const known = new Set(asset.valueHistory.map((row) => row.id));
    const input = { value: parsed.value, date, ...(note.trim() && { note: note.trim() }) };
    startSave(async () => {
      try {
        const result = await updateAssetValueAction(businessId, id, input);
        if (!result.success || !result.data) {
          toast.error(t(result.message ?? "Failed to update value"));
          return;
        }
        // The row this update wrote, for its Undo.
        const added = result.data.valueHistory.find((row) => !known.has(row.id));
        onClose();
        onSaved();
        doneToast(
          t("Value updated: {name} · {amount}", { name: result.data.name, amount: money(input.value) }),
          added && {
            label: t("Undo"),
            run: async () => {
              const back = await deleteAssetValueUpdateAction(businessId, id, added.id);
              if (back.success) onSaved();
              else toast.error(t(back.message ?? "Failed to delete the value update"));
            },
          },
        );
      } catch {
        toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
      }
    });
  }

  const change = "value" in parsed ? parsed.value - current : 0;
  const tone = assetTone(change);
  const updates = updateCount(asset);

  return (
    <Dialog open onOpenChange={(next) => !next && !isSaving && onClose()}>
      <DialogContent showCloseButton={false} onOpenAutoFocus={(event) => event.preventDefault()} className="flex max-h-[calc(100dvh-48px)] w-130 max-w-[calc(100vw-32px)] flex-col gap-0 overflow-hidden rounded-[20px] border-0 bg-surface p-0 leading-[normal] text-ink shadow-overlay ring-0 sm:max-w-[calc(100vw-32px)]">
        <div className="flex items-center gap-3 border-b border-line py-3.5 pr-4 pl-6">
          <AssetTile look={look} className="size-10 rounded-[10px]" glyph={19} />
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <DialogTitle className="text-[17px] font-semibold text-ink">{t("Update value")}</DialogTitle>
            <DialogDescription asChild>
              <span className="flex min-w-0 gap-1 text-[13px] leading-[normal] text-ink-muted">
                <span className="truncate">{asset.name}</span>
                <span className="shrink-0">· {t(asset.category)}</span>
              </span>
            </DialogDescription>
          </span>
          <button type="button" aria-label={t("Close")} disabled={isSaving} onClick={onClose} className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-3 rounded-[12px] border border-line bg-strip px-4 py-3.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[12px] text-ink-muted">{t("You paid")}</span>
              <span className="text-[18px] font-bold tabular-nums">{money(paid)}</span>
              <span className="text-[12px] text-ink-muted">{originText(asset, t, day)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[12px] text-ink-muted">{t("Current value")}</span>
              <span className="text-[18px] font-bold tabular-nums">{money(current)}</span>
              <span className="text-[12px] text-ink-muted">{updates ? t("Updated on {date}", { date: day(lastValueDay(asset)) }) : t("No updates yet")}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="uv-new" className={LABEL}>
              {`${label} (${currencySymbol(currency, fmt)})`}
            </label>
            <MoneyField
              id="uv-new"
              symbol={currencySymbol(currency, fmt)}
              size="md"
              placeholder={t("Today’s market value")}
              value={value}
              wrong={!!errors.value}
              onEnter={save}
              onChange={(next) => {
                setValue(next);
                setErrors((current) => ({ ...current, value: undefined }));
              }}
            />
            {errors.value && <FieldError>{errors.value}</FieldError>}
          </div>
          {"value" in parsed && (
            <div aria-live="polite" className={cn("flex flex-col gap-1 rounded-[10px] px-3.5 py-3", tone.wash)}>
              <span className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-ink-2">{t("Change from current value")}</span>
                <span className={cn("text-[14px] font-bold whitespace-nowrap tabular-nums", tone.ink)}>{shown(change, current)}</span>
              </span>
              <span className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-ink-soft">{t("Compared with what you paid")}</span>
                <span className={cn("text-[12.5px] font-semibold whitespace-nowrap tabular-nums", assetTone(parsed.value - paid).ink)}>{shown(parsed.value - paid, paid)}</span>
              </span>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="uv-date" className={LABEL}>
              {t("Update date")}
            </label>
            <input
              id="uv-date"
              type="date"
              max={getAppToday()}
              value={date}
              aria-invalid={!!errors.date || undefined}
              onChange={(event) => {
                setDate(event.target.value);
                setErrors((current) => ({ ...current, date: undefined }));
              }}
              className={cn(FIELD, fieldEdge(!!errors.date))}
            />
            {errors.date && <FieldError>{errors.date}</FieldError>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="uv-note" className={LABEL}>
              {t("Note")} <span className="font-normal text-ink-muted">{t("(optional)")}</span>
            </label>
            <input
              id="uv-note"
              type="text"
              maxLength={VALUE_NOTE_MAX}
              autoComplete="off"
              placeholder={t("e.g. Checked with local broker")}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  save();
                }
              }}
              className={cn(FIELD, "border-input")}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2.5 border-t border-line px-6 py-3.5">
          <button type="button" onClick={onClose} disabled={isSaving} className="h-11 rounded-full border border-input bg-surface px-4.5 text-[14px] font-semibold text-ink hover:bg-surface-sunken">
            {t("Cancel")}
          </button>
          <button type="button" onClick={save} disabled={isSaving} className="flex h-11 items-center gap-2 rounded-full bg-emerald px-5 text-[14px] font-semibold text-white hover:bg-emerald-hover">
            {isSaving && <Loader size={16} onDark label={t("Saving...")} />}
            {t("Save value")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
