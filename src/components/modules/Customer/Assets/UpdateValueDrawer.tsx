"use client";

import { CalendarDays, TrendingDown, TrendingUp, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createElement, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import { updateAssetValueAction } from "@/lib/customer/assetActions";
import { categoryVisual, gainChip, lastValued } from "@/lib/customer/assetDisplay";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { normalizeMoneyInput } from "@/lib/customer/money";
import { getAppToday } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface UpdateValueDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  asset: Asset | null;
  categories: AssetCategoryOption[];
  currency: string;
}

const CHIP = { income: "bg-mint-50 text-emerald", expense: "bg-expense-soft text-expense", neutral: "bg-surface-sunken text-ink-2" } as const;

// Record what an asset is worth now: the new value against the last one and
// against what was paid, with the whole value history under it.
export function UpdateValueDrawer({ open, onClose, businessId, asset, categories, currency }: UpdateValueDrawerProps) {
  const { t } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(getAppToday());
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open && asset ? asset.id : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open && asset) {
      setValue(String(Number(asset.currentValue)));
      setDate(getAppToday());
      setNote("");
    }
  }

  if (!asset) return null;
  const next = Number(value) || 0;
  const current = Number(asset.currentValue);
  const paid = Number(asset.purchasePrice);
  const changed = next > 0 && next !== current;
  const sinceLast = gainChip(current > 0 ? ((next - current) / current) * 100 : 0);
  const vsPaid = gainChip(paid > 0 ? ((next - paid) / paid) * 100 : 0);
  const visual = categoryVisual(categories, asset.category);
  const since = lastValued(asset);
  const history = [...asset.valueHistory].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const valid = next > 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending || !asset) return;
    startTransition(async () => {
      const result = await updateAssetValueAction(businessId, asset.id, { value: next, date, note: note.trim() || undefined });
      if (result.success) {
        toast.success(t("Value updated"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to update value"));
      }
    });
  }

  const label = (text: string, optional = false) => (
    <span className="text-body font-medium text-ink">
      {text} {optional && <span className="font-normal text-ink-muted">({t("optional")})</span>}
    </span>
  );

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent
        side={wide ? "right" : "bottom"}
        showCloseButton={false}
        className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-115 shadow-[-28px_0_60px_-16px_rgba(11,61,46,0.3)] data-[side=right]:sm:max-w-115" : "h-[92vh] rounded-t-xl")}
      >
        <SheetHeader className={cn("flex-row items-center gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md [&_svg]:size-4.5", visual.tone.bg, visual.tone.fg)}>{createElement(visual.icon, { "aria-hidden": true })}</span>
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <SheetTitle className="text-h3 text-ink">{t("Update value")}</SheetTitle>
            <span className="truncate text-small text-ink-muted">
              {asset.name} · {asset.category}
            </span>
          </span>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-cream p-4 tabular-nums">
              <span className="flex flex-col gap-0.5">
                <span className="text-caption font-normal text-ink-muted">{t("Current value")}</span>
                <span className="text-title text-ink">{formatCurrency(current, currency)}</span>
                <span className="text-caption font-normal text-ink-muted">{since ? `${t("since")} ${formatDate(since)}` : t("never checked")}</span>
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-caption font-normal text-ink-muted">{t("You paid")}</span>
                <span className="text-title text-ink">{formatCurrency(paid, currency)}</span>
                <span className="text-caption font-normal text-ink-muted">
                  {t("on")} {formatDate(asset.purchaseDate)}
                </span>
              </span>
            </div>

            <Field htmlFor="upd-value" label={label(t("New value"))}>
              <Input
                id="upd-value"
                type="text"
                inputMode="decimal"
                size="xl"
                value={value}
                onChange={(event) => setValue(normalizeMoneyInput(event.target.value))}
                placeholder="0"
                autoFocus
                leading={<span className="flex h-14 w-13 items-center justify-center border-r border-line bg-cream text-h2 font-semibold text-ink-2">{currencySymbol(currency)}</span>}
                frameClassName="h-14 gap-0 overflow-hidden pl-0"
                className="pl-4 text-h2 tabular-nums"
              />
              {next > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-caption font-semibold tabular-nums", CHIP[sinceLast.tone])}>
                    {sinceLast.tone === "income" ? <TrendingUp className="size-3.5" aria-hidden="true" /> : sinceLast.tone === "expense" ? <TrendingDown className="size-3.5" aria-hidden="true" /> : null}
                    {changed ? `${next > current ? "+" : "−"} ${formatCurrency(Math.abs(next - current), currency)} (${sinceLast.label}) ${t("since last value")}` : t("Same as the last value")}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-surface-sunken px-3 py-1 text-caption font-semibold text-ink-2 tabular-nums">
                    {vsPaid.label} {t("vs what you paid")}
                  </span>
                </div>
              )}
            </Field>

            <div className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)]">
              <Field htmlFor="upd-date" label={label(t("Date"))}>
                <Input id="upd-date" type="date" size="md" value={date} onChange={(event) => setDate(event.target.value)} max={getAppToday()} leading={<CalendarDays />} className="px-0" frameClassName="px-3" />
              </Field>
              <Field htmlFor="upd-note" label={label(t("Note"), true)}>
                <Input id="upd-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder={t("Mouza rate went up")} className="px-0" frameClassName="px-3" />
              </Field>
            </div>

            <section className="flex flex-col">
              <h3 className="mb-2 text-body font-semibold text-ink">{t("Value history")}</h3>
              {changed && <HistoryRow date={`${t("Today")}, ${formatDate(date)} · ${t("new")}`} note={note.trim() || t("This update")} value={formatCurrency(next, currency)} kind="new" line />}
              {history.map((entry, index) => (
                <HistoryRow key={entry.id} date={formatDate(entry.recordedAt)} note={entry.note || (index === history.length - 1 ? t("Bought") : t("Checked"))} value={formatCurrency(entry.value, currency)} kind={index === history.length - 1 ? "first" : "past"} line={index < history.length - 1} />
              ))}
            </section>
          </div>

          <div className={cn("flex items-center justify-end gap-3 border-t border-line bg-surface", wide ? "px-6 py-4" : "px-4 pt-3 pb-6")}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="action" disabled={!valid || isPending} className="px-5">
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {t("Save new value")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// One point on the timeline: the dot, the date and note, the value.
function HistoryRow({ date, note, value, kind, line }: { date: string; note: string; value: string; kind: "new" | "past" | "first"; line: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex w-3.5 flex-col items-center">
        <span className={cn("mt-1 size-3 shrink-0 rounded-full border-2", kind === "new" ? "border-dashed border-emerald bg-surface" : kind === "first" ? "border-ink-muted bg-surface" : "border-emerald bg-emerald")} />
        {line && <span className="min-h-6.5 w-0.5 flex-1 bg-surface-sunken" />}
      </div>
      <div className="flex flex-1 justify-between gap-3 pb-3">
        <span className="flex min-w-0 flex-col gap-px">
          <span className={cn("text-small", kind === "new" ? "font-semibold text-emerald" : "font-medium text-ink")}>{date}</span>
          <span className="truncate text-caption font-normal text-ink-muted">{note}</span>
        </span>
        <span className={cn("text-body font-semibold tabular-nums", kind === "new" ? "text-emerald" : "text-ink")}>{value}</span>
      </div>
    </div>
  );
}
