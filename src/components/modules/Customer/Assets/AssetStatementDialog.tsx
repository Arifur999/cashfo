"use client";

import { Pencil, Printer, Trash2, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import Loader from "@/components/shared/Loader";
import IconAction from "@/components/smartly/IconAction";
import type { Account, Asset, AssetCategoryOption } from "@/lib/customer/api";
import { deleteAssetValueUpdateAction, editAssetValueUpdateAction, updateAssetValueAction } from "@/lib/customer/assetActions";
import { assetGain, statementLines, type StatementLine, updateCount } from "@/lib/customer/assetDisplay";
import { lastValueDay, parseAmount, VALUE_NOTE_MAX } from "@/lib/customer/assetForm";
import { currencySymbol, formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { getAppToday } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { assetLook, AssetTile, assetTone, changePercent } from "./assetLook";
import { doneToast, FIELD, FieldError, fieldEdge, LABEL } from "./assetUi";
import { originText } from "./UpdateValueDialog";
import { walletName } from "./walletOptions";

interface AssetStatementDialogProps {
  asset: Asset | null;
  onClose: () => void;
  onUpdate: (asset: Asset) => void;
  onChanged: () => void;
  businessId: string;
  categories: AssetCategoryOption[];
  wallets: Account[];
  currency: string;
  canManage: boolean;
}

// One row of the statement, as both the popup and the printed page show it.
interface Row {
  key: string;
  date: string;
  entry: string;
  note: string;
  sub: string;
  previous: number | null;
  value: number;
  change: number | null;
  // An update that can be set right (not the start, not a sold asset's).
  line: StatementLine | null;
  locked: string;
}

const COLUMNS = "grid-cols-[30px_104px_minmax(0,1fr)_116px_116px_132px_76px]";
const PRINT_TH = "border-b-[1.5px] border-ink px-2 py-1.75 text-[10.5px] font-semibold tracking-[0.04em] text-ink-soft uppercase";
const PRINT_TD = "border-b border-line-card px-2 py-1.75 align-top text-[11.5px]";

// Update › Value history: the asset's value statement, from what was paid
// through every update to the sale, with the totals over it. An update can
// be set right or deleted (each with Undo), and the statement prints.
export function AssetStatementDialog({ asset, onClose, onUpdate, onChanged, businessId, categories, wallets, currency, canManage }: AssetStatementDialogProps) {
  const { t, fmt } = useLocale();
  const [editing, setEditing] = useState<{ line: StatementLine; value: string; note: string; error: string } | null>(null);
  const [deleting, setDeleting] = useState<{ line: StatementLine; last: boolean; before: number | null } | null>(null);
  const [printing, setPrinting] = useState(false);
  const [isSaving, startSave] = useTransition();
  const printRef = useRef<HTMLElement>(null);

  if (!asset) return <Dialog open={false} />;
  const look = assetLook(categories, asset.category);
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const signed = (value: number) => formatSignedCurrency(value, currency, fmt);
  const pct = (change: number, base: number) => toLocaleDigits(changePercent(change, base), fmt);
  const day = (iso: string) => formatDate(`${iso.slice(0, 10)}T00:00:00.000Z`, "d MMM yyyy", fmt);
  const sold = asset.status === "SOLD";
  const paid = Number(asset.purchasePrice);
  const lines = statementLines(asset);
  const updates = updateCount(asset);
  const wallet = walletName(wallets, asset.purchaseAccountId);

  const rows: Row[] = lines.map((line, index) => {
    const first = index === 0;
    return {
      key: line.id,
      date: line.date,
      entry: first ? t(asset.purchaseAccountId ? "Purchase price" : "Starting value") : t("Value update"),
      note: first ? "" : (line.note ?? ""),
      sub: first ? (asset.purchaseAccountId ? (wallet ? t("Paid from {wallet}", { wallet }) : t("Purchase price")) : t("Value when you added it")) : "",
      previous: line.previous,
      value: line.value,
      change: line.change,
      line: first || sold ? null : line,
      locked: first ? t("Fixed") : t("Read only"),
    };
  });
  const last = lines[lines.length - 1];
  if (sold && asset.soldAt && last) {
    const price = Number(asset.soldPrice ?? 0);
    rows.push({ key: "sale", date: asset.soldAt, entry: t("Sold"), note: asset.soldNote ?? "", sub: "", previous: last.value, value: price, change: price - last.value, line: null, locked: t("Read only") });
  }
  const total = assetGain(asset).amount;
  const summary = [
    { label: t("You paid"), value: money(paid), sub: originText(asset, t, day), ink: "text-ink" },
    sold
      ? { label: t("Sold for"), value: money(asset.soldPrice ?? 0), sub: t("Sold on {date}", { date: day(asset.soldAt ?? asset.purchaseDate) }), ink: "text-ink" }
      : { label: t("Current value"), value: money(asset.currentValue), sub: updates ? t("Updated on {date}", { date: day(lastValueDay(asset)) }) : t("No updates yet"), ink: "text-ink" },
    {
      label: t(sold ? "Gain or loss on sale" : "Total change"),
      value: signed(total),
      sub: `${pct(total, paid)} · ${t(updates === 1 ? "{count} update" : "{count} updates", { count: formatCount(updates, fmt) })}`,
      ink: assetTone(total).ink,
    },
  ];
  const meta = [
    { label: t("Asset"), value: asset.name },
    { label: t("Category"), value: t(asset.category) },
    { label: t(asset.purchaseAccountId ? "Bought on" : "Owned since"), value: day(asset.purchaseDate) },
    { label: t("Status"), value: sold ? t("Sold on {date}", { date: day(asset.soldAt ?? asset.purchaseDate) }) : t("Active") },
  ];
  const statementTitle = t("Asset value statement");

  function saveEdit() {
    if (!editing || !asset) return;
    const parsed = parseAmount(editing.value, t("Value"));
    if ("problem" in parsed) return setEditing({ ...editing, error: t(parsed.problem.key, parsed.problem.values) });
    const { line } = editing;
    const id = asset.id;
    const date = line.date.slice(0, 10);
    const before = { value: line.value, date, ...(line.note && { note: line.note }) };
    const note = editing.note.trim();
    startSave(async () => {
      try {
        const result = await editAssetValueUpdateAction(businessId, id, line.id, { value: parsed.value, date, ...(note && { note }) });
        if (!result.success) {
          toast.error(t(result.message ?? "Failed to save the value update"));
          return;
        }
        setEditing(null);
        onChanged();
        doneToast(t("Update changed"), {
          label: t("Undo"),
          run: async () => {
            const back = await editAssetValueUpdateAction(businessId, id, line.id, before);
            if (back.success) onChanged();
            else toast.error(t(back.message ?? "Failed to save the value update"));
          },
        });
      } catch {
        toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
      }
    });
  }

  function confirmDelete() {
    if (!deleting || !asset) return;
    const { line } = deleting;
    const id = asset.id;
    const again = { value: line.value, date: line.date.slice(0, 10), ...(line.note && { note: line.note }) };
    startSave(async () => {
      try {
        const result = await deleteAssetValueUpdateAction(businessId, id, line.id);
        if (!result.success) {
          toast.error(t(result.message ?? "Failed to delete the value update"));
          return;
        }
        setDeleting(null);
        onChanged();
        doneToast(t("Value update deleted"), {
          label: t("Undo"),
          run: async () => {
            const back = await updateAssetValueAction(businessId, id, again);
            if (back.success) onChanged();
            else toast.error(t(back.message ?? "Failed to update value"));
          },
        });
      } catch {
        toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
      }
    });
  }

  // Prints the page alone: a frame of its own with the app's styles.
  function print() {
    const page = printRef.current;
    if (!page) return;
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(frame);
    const doc = frame.contentWindow?.document;
    if (!doc) return frame.remove();
    const styles = [...document.querySelectorAll('link[rel="stylesheet"], style')].map((node) => node.outerHTML).join("");
    doc.open();
    doc.write(`<!doctype html><html class="${document.documentElement.className}"><head><meta charset="utf-8">${styles}<style>@page{size:A4;margin:12mm}body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}article{width:auto!important;min-height:0!important;box-shadow:none!important;padding:0!important}tr{break-inside:avoid}thead{display:table-header-group}</style></head><body>${page.outerHTML}</body></html>`);
    doc.close();
    // Set as text, never written into the HTML: the title is translated, and
    // Bangla edited in Admin › Content › Translations must not become markup.
    doc.title = statementTitle;
    setTimeout(() => {
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
      } finally {
        setTimeout(() => frame.remove(), 1500);
      }
    }, 400);
  }

  const diffCell = (row: Row) =>
    row.change === null ? (
      <span className="font-semibold text-ink-soft">{t("Start")}</span>
    ) : (
      <>
        <span className={cn("font-semibold whitespace-nowrap", assetTone(row.change).ink)}>{signed(row.change)}</span>
        <span className={cn("rounded-full px-1.75 py-px text-[11px] font-bold", assetTone(row.change).chip, assetTone(row.change).ink)}>{pct(row.change, row.previous ?? 0)}</span>
      </>
    );

  return (
    <>
      <Dialog open onOpenChange={(next) => !next && onClose()}>
        <DialogContent showCloseButton={false} onOpenAutoFocus={(event) => event.preventDefault()} className="flex max-h-[calc(100dvh-48px)] w-230 max-w-[calc(100vw-32px)] flex-col gap-0 overflow-hidden rounded-[20px] border-0 bg-surface p-0 leading-[normal] text-ink shadow-overlay ring-0 sm:max-w-[calc(100vw-32px)]">
          <div className="flex items-center gap-3 border-b border-line py-4 pr-4 pl-6">
            <AssetTile look={look} className="size-11 rounded-[12px]" glyph={22} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[12px] font-semibold tracking-[0.04em] text-ink-muted uppercase">{statementTitle}</span>
              <DialogTitle className="flex min-w-0 gap-1.5 text-[18px] font-semibold text-ink">
                <span className="truncate">{asset.name}</span>
                <span className="shrink-0 font-medium text-ink-muted">· {t(asset.category)}</span>
                {sold && <span className="shrink-0 self-center rounded-full bg-quiet-chip px-2.25 py-0.5 text-[12px] font-semibold text-ink-soft">{t("Sold")}</span>}
              </DialogTitle>
              <DialogDescription className="sr-only">{statementTitle}</DialogDescription>
            </span>
            <button type="button" onClick={() => setPrinting(true)} className="flex h-11 items-center gap-1.5 rounded-full border border-input bg-surface px-3.5 text-[13px] font-semibold whitespace-nowrap text-ink hover:bg-surface-sunken max-sm:hidden">
              <Printer className="size-3.75 text-ink-soft" aria-hidden="true" />
              {t("Print statement")}
            </button>
            <button type="button" aria-label={t("Close")} onClick={onClose} className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken">
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-3 rounded-[12px] border border-line bg-strip">
              {summary.map((card, index) => (
                <div key={card.label} className={cn("flex flex-col gap-0.5 px-4 py-3", index > 0 && "border-l border-line")}>
                  <span className="text-[12px] text-ink-muted">{card.label}</span>
                  <span className={cn("text-[18px] font-bold tabular-nums", card.ink)}>{card.value}</span>
                  <span className="text-[12px] text-ink-muted">{card.sub}</span>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto rounded-[12px] border border-line">
              <div className="min-w-205">
                <div className={cn("grid items-center gap-x-3 border-b border-line bg-strip px-4 py-2.5 text-[12px] font-semibold text-ink-muted", COLUMNS)}>
                  <span>#</span>
                  <span>{t("Date")}</span>
                  <span>{t("Entry")}</span>
                  <span className="text-right">{t("Previous value")}</span>
                  <span className="text-right">{t("New value")}</span>
                  <span className="text-right">{t("Difference")}</span>
                  <span className="text-right">{t("Action")}</span>
                </div>
                {rows.map((row, index) => (
                  <div key={row.key} className={cn("grid min-h-14 items-center gap-x-3 border-b border-quiet-chip px-4 py-2 text-[13px] tabular-nums last:border-b-0", COLUMNS)}>
                    <span className="text-ink-muted">{formatCount(index + 1, fmt)}</span>
                    <span className="whitespace-nowrap text-ink-2">{day(row.date)}</span>
                    <span className="flex min-w-0 flex-col gap-px">
                      <span className="font-semibold text-ink">{row.entry}</span>
                      {(row.note || row.sub) && (
                        <span title={row.note || row.sub} className="truncate text-[12px] text-ink-muted">
                          {row.note || row.sub}
                        </span>
                      )}
                    </span>
                    <span className="text-right whitespace-nowrap text-ink-soft">{row.previous === null ? "" : money(row.previous)}</span>
                    <span className="text-right font-bold whitespace-nowrap">{money(row.value)}</span>
                    <span className="flex flex-col items-end gap-0.5">{diffCell(row)}</span>
                    <span className="flex justify-end gap-1.5">
                      {row.line && canManage ? (
                        <>
                          <IconAction onClick={() => row.line && setEditing({ line: row.line, value: String(row.line.value), note: row.line.note ?? "", error: "" })} aria-label={t("Edit update of {date}", { date: day(row.date) })} title={t("Edit this update")}>
                            <Pencil aria-hidden="true" />
                          </IconAction>
                          <IconAction tone="danger" onClick={() => row.line && setDeleting({ line: row.line, last: index === lines.length - 1, before: row.previous })} aria-label={t("Delete update of {date}", { date: day(row.date) })} title={t("Delete this update")}>
                            <Trash2 aria-hidden="true" />
                          </IconAction>
                        </>
                      ) : (
                        <span className="text-[12px] whitespace-nowrap text-ink-faint">{row.line ? t("Read only") : row.locked}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-line px-6 py-3.5">
            <span className="text-[12.5px] text-ink-muted">{t(sold ? "This asset is sold, so its history is read only." : "Every update adds a new row. The purchase price can be changed from All Assets.")}</span>
            <span className="flex gap-2.5">
              {!sold && canManage && (
                <button type="button" onClick={() => onUpdate(asset)} className="h-11 rounded-full border border-input bg-surface px-4.5 text-[14px] font-semibold text-ink hover:bg-surface-sunken">
                  {t("Update value")}
                </button>
              )}
              <button type="button" onClick={onClose} className="h-11 rounded-full bg-emerald px-5.5 text-[14px] font-semibold text-white hover:bg-emerald-hover">
                {t("Close")}
              </button>
            </span>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(next) => !next && !isSaving && setEditing(null)}>
        <DialogContent showCloseButton={false} className="flex w-115 max-w-[calc(100vw-32px)] flex-col gap-0 rounded-[18px] border-0 bg-surface p-0 leading-[normal] text-ink shadow-overlay ring-0 sm:max-w-[calc(100vw-32px)]">
          <div className="flex items-center gap-3 border-b border-line py-3.5 pr-4 pl-6">
            <span className="flex min-w-0 flex-1 flex-col gap-px">
              <DialogTitle className="text-[17px] font-semibold text-ink">{t("Edit value update")}</DialogTitle>
              <DialogDescription className="text-[13px] text-ink-muted">{editing ? `${asset.name} · ${day(editing.line.date)}` : ""}</DialogDescription>
            </span>
            <button type="button" aria-label={t("Close")} onClick={() => setEditing(null)} className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken">
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>
          {editing && (
            <div className="flex flex-col gap-3.5 px-6 py-4.5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ue-v" className={LABEL}>{`${t("Value")} (${currencySymbol(currency, fmt)})`}</label>
                <input
                  id="ue-v"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={editing.value}
                  aria-invalid={!!editing.error || undefined}
                  onChange={(event) => setEditing({ ...editing, value: event.target.value, error: "" })}
                  onKeyDown={(event) => event.key === "Enter" && saveEdit()}
                  className={cn(FIELD, "h-12 text-[17px] font-bold tabular-nums", fieldEdge(!!editing.error))}
                />
                {editing.error && <FieldError>{editing.error}</FieldError>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ue-n" className={LABEL}>
                  {t("Note")} <span className="font-normal text-ink-muted">{t("(optional)")}</span>
                </label>
                <input id="ue-n" type="text" maxLength={VALUE_NOTE_MAX} autoComplete="off" value={editing.note} onChange={(event) => setEditing({ ...editing, note: event.target.value })} onKeyDown={(event) => event.key === "Enter" && saveEdit()} className={cn(FIELD, "border-input")} />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2.5 border-t border-line px-6 py-3.5">
            <button type="button" onClick={() => setEditing(null)} disabled={isSaving} className="h-11 rounded-full border border-input bg-surface px-4.5 text-[14px] font-semibold text-ink hover:bg-surface-sunken">
              {t("Cancel")}
            </button>
            <button type="button" onClick={saveEdit} disabled={isSaving} className="flex h-11 items-center gap-2 rounded-full bg-emerald px-5 text-[14px] font-semibold text-white hover:bg-emerald-hover">
              {isSaving && <Loader size={16} onDark label={t("Saving...")} />}
              {t("Save changes")}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(next) => !next && !isSaving && setDeleting(null)}>
        <DialogContent showCloseButton={false} className="flex w-105 max-w-[calc(100vw-32px)] flex-col gap-2.5 rounded-[18px] border-0 bg-surface p-6 leading-[normal] text-ink shadow-overlay ring-0 sm:max-w-[calc(100vw-32px)]">
          <DialogTitle className="text-[18px] font-semibold text-ink">{t("Delete this value update?")}</DialogTitle>
          {deleting && (
            <>
              <DialogDescription className="text-[14px] leading-normal text-ink-soft">
                {deleting.last && deleting.before !== null ? t("The current value goes back to {amount}. You can undo this right after.", { amount: money(deleting.before) }) : t("Only this entry is removed. The current value stays the same.")}
              </DialogDescription>
              <div className="mt-1 flex items-center gap-3 rounded-[14px] border border-line px-3.5 py-3">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[14px] font-semibold">{day(deleting.line.date)}</span>
                  {deleting.line.note && <span className="truncate text-[12px] text-ink-muted">{deleting.line.note}</span>}
                </span>
                <span className="text-[15px] font-bold whitespace-nowrap tabular-nums">{money(deleting.line.value)}</span>
              </div>
            </>
          )}
          <div className="mt-2 flex justify-end gap-2.5">
            <button type="button" onClick={() => setDeleting(null)} disabled={isSaving} className="h-11 rounded-full border border-input bg-surface px-4.5 text-[14px] font-semibold text-ink hover:bg-surface-sunken">
              {t("Cancel")}
            </button>
            <button type="button" onClick={confirmDelete} disabled={isSaving} className="flex h-11 items-center gap-2 rounded-full bg-expense-fill px-5 text-[14px] font-semibold text-white hover:opacity-90">
              {isSaving && <Loader size={16} onDark label={t("Deleting...")} />}
              {t("Delete update")}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={printing} onOpenChange={(next) => !next && setPrinting(false)}>
        <DialogContent showCloseButton={false} className="flex h-dvh w-screen max-w-none flex-col items-center gap-3 rounded-none border-0 bg-scrim px-0 py-4 leading-[normal] shadow-none ring-0 sm:max-w-none">
          <div role="toolbar" aria-label={t("Print preview")} className="flex w-198.5 max-w-[calc(100vw-32px)] shrink-0 items-center justify-between gap-3 rounded-[16px] bg-ink py-2.5 pr-2.5 pl-4.5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
            <div className="flex min-w-0 flex-col text-white">
              <DialogTitle className="text-[16px] font-semibold text-white">{t("Print preview")}</DialogTitle>
              <DialogDescription className="text-[12.5px] text-white/75">{t("A4 · To save a PDF, pick “Save as PDF” in the print window.")}</DialogDescription>
            </div>
            <div className="flex shrink-0 gap-2.5">
              <button type="button" onClick={() => setPrinting(false)} className="h-11 rounded-full border border-white/35 px-4.5 text-[14px] font-semibold text-white hover:bg-white/10">
                {t("Close")}
              </button>
              <button type="button" onClick={print} className="flex h-11 items-center gap-2 rounded-full bg-emerald px-4.5 text-[14px] font-semibold text-white hover:bg-emerald-hover">
                <Printer className="size-4" aria-hidden="true" />
                {t("Print or save PDF")}
              </button>
            </div>
          </div>
          <div className="min-h-0 w-full flex-1 overflow-y-auto px-2 pb-2">
            <article ref={printRef} aria-label={statementTitle} className="mx-auto flex min-h-250 w-198.5 max-w-full flex-col gap-4.5 rounded-[4px] bg-surface px-11 py-10 text-ink shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
              <header className="flex items-start justify-between border-b-2 border-ink pb-3.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[20px] font-bold">Smartly</span>
                  <span className="text-[11px] text-ink-muted">{t("Assets Management")}</span>
                </div>
                <div className="flex flex-col items-end gap-0.75">
                  <span className="text-[16px] font-bold tracking-[0.05em] uppercase">{statementTitle}</span>
                  <span className="text-[11px] text-ink-muted">{t("Generated {date}", { date: day(getAppToday()) })}</span>
                </div>
              </header>
              <div className="grid grid-cols-4 gap-3 text-[11.5px]">
                {meta.map((item) => (
                  <div key={item.label} className="flex min-w-0 flex-col gap-0.75">
                    <span className="text-ink-muted">{item.label}</span>
                    <span className="text-[13px] font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 overflow-hidden rounded-[6px] border border-input">
                {summary.map((card) => (
                  <div key={card.label} className="flex flex-col gap-0.75 border-r border-line-card px-3 py-2.5">
                    <span className="text-[10.5px] text-ink-muted">{card.label}</span>
                    <span className={cn("text-[14px] font-bold tabular-nums", card.ink)}>{card.value}</span>
                    <span className="text-[10.5px] text-ink-muted">{card.sub}</span>
                  </div>
                ))}
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={cn(PRINT_TH, "text-left")}>#</th>
                    <th className={cn(PRINT_TH, "text-left")}>{t("Date")}</th>
                    <th className={cn(PRINT_TH, "text-left")}>{t("Entry")}</th>
                    <th className={cn(PRINT_TH, "text-right")}>{t("Previous value")}</th>
                    <th className={cn(PRINT_TH, "text-right")}>{t("New value")}</th>
                    <th className={cn(PRINT_TH, "text-right")}>{t("Difference")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.key}>
                      <td className={cn(PRINT_TD, "text-ink-muted")}>{formatCount(index + 1, fmt)}</td>
                      <td className={cn(PRINT_TD, "whitespace-nowrap")}>{day(row.date)}</td>
                      <td className={PRINT_TD}>
                        <span className="font-semibold">{row.entry}</span>
                        {(row.note || row.sub) && <span className="block text-ink-muted">{row.note || row.sub}</span>}
                      </td>
                      <td className={cn(PRINT_TD, "text-right whitespace-nowrap tabular-nums")}>{row.previous === null ? "" : money(row.previous)}</td>
                      <td className={cn(PRINT_TD, "text-right font-semibold whitespace-nowrap tabular-nums")}>{money(row.value)}</td>
                      <td className={cn(PRINT_TD, "text-right font-semibold whitespace-nowrap tabular-nums", row.change === null ? "text-ink-soft" : assetTone(row.change).ink)}>
                        {row.change === null ? t("Start") : `${signed(row.change)} (${pct(row.change, row.previous ?? 0)})`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex-1" />
              <footer className="flex justify-between border-t border-input pt-2.5 text-[10.5px] text-ink-muted">
                <span>{t("Values are your own estimates, entered in Smartly.")}</span>
                <span>Smartly</span>
              </footer>
            </article>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
