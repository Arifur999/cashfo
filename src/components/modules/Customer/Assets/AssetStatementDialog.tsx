"use client";

import { Pencil, Printer, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import AmountInput from "@/components/modules/Customer/Shared/AmountInput";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Input from "@/components/smartly/form/Input";
import IconAction from "@/components/smartly/IconAction";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
import { deleteAssetValueUpdateAction, editAssetValueUpdateAction } from "@/lib/customer/assetActions";
import { getAppToday } from "@/lib/date";
import { categoryVisual, isInitialValueNote, statementLines, type StatementLine } from "@/lib/customer/assetDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AssetTypeTile } from "./AssetTypeTile";

interface AssetStatementDialogProps {
  open: boolean;
  onClose: () => void;
  asset: Asset | null;
  categories: AssetCategoryOption[];
  currency: string;
  // With both, an owned asset's value updates can be set right or removed
  // (the owner or an accountant; never a sold asset's history).
  businessId?: string;
  canManage?: boolean;
  // The footer's Update value (an owned asset, for those who may).
  onUpdate?: () => void;
}

// The board's table: #, Date, Entry, Previous value, New value, Difference
// (with its percent), Actions.
const COLUMNS = "grid-cols-[30px_104px_minmax(8rem,1fr)_116px_116px_132px_76px]";

const escape = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

// An asset's value statement: where it started, where it stands, the
// whole change, and every value it was recorded at with the move from the
// one before. Print (or save as PDF) opens it on a page of its own.
export function AssetStatementDialog({ open, onClose, asset, categories, currency, businessId, canManage = false, onUpdate }: AssetStatementDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  // The update being set right, and its fields.
  const [editing, setEditing] = useState<StatementLine | null>(null);
  const [form, setForm] = useState({ value: "", date: "", note: "" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  if (!asset) return null;
  const editable = canManage && !!businessId && asset.status === "ACTIVE";
  const today = getAppToday();
  const bought = asset.purchaseDate.slice(0, 10);
  const formValue = Number(form.value) || 0;
  const formValid = formValue > 0 && form.date >= bought && form.date <= today;

  function run(id: string, action: () => Promise<{ success: boolean; message?: string }>, done: string, failed: string, after?: () => void) {
    setBusyId(id);
    startTransition(async () => {
      const result = await action().catch(() => ({ success: false, message: undefined }));
      setBusyId(null);
      if (result.success) {
        toast.success(t(done));
        after?.();
        router.refresh();
      } else {
        toast.error(t(result.message ?? failed));
      }
    });
  }

  function openEdit(line: StatementLine) {
    setEditing(line);
    setForm({ value: String(line.value), date: line.date.slice(0, 10), note: line.note && !isInitialValueNote(line.note) ? line.note : "" });
  }

  function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing || !businessId || !asset || !formValid || isPending) return;
    const line = editing;
    run(line.id, () => editAssetValueUpdateAction(businessId, asset.id, line.id, { value: formValue, date: form.date, note: form.note.trim() || undefined }), "Value update saved", "Failed to save the value update", () => setEditing(null));
  }

  async function removeLine(line: StatementLine) {
    if (!businessId || !asset || isPending) return;
    const ok = await confirm({
      title: t("Delete this value update?"),
      message: t("{date} · {amount}. The value today becomes the newest update left.", { date: day(line.date), amount: money(line.value) }),
      confirmLabel: "Delete update",
      danger: true,
    });
    if (ok) run(line.id, () => deleteAssetValueUpdateAction(businessId, asset.id, line.id), "Value update deleted", "Failed to delete the value update");
  }

  const lines = statementLines(asset);
  const first = lines[0];
  const last = lines[lines.length - 1];
  const purchased = !!asset.purchaseAccountId;
  const origin = t(purchased ? "Purchased" : "Listed");
  const updates = lines.length - 1;
  const money = (value: number) => formatCurrency(value, currency, fmt);
  const day = (iso: string) => formatDate(iso, "d MMM yyyy", fmt);
  const signed = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""} ${money(Math.abs(value))}`.trim();
  const percent = (value: number) => toLocaleDigits(`${Math.abs(value).toFixed(1)}%`, fmt);
  const total = first && last ? last.value - first.value : 0;
  const totalPercent = first && first.value > 0 ? (total / first.value) * 100 : 0;
  const tone = (value: number | null) => (value === null || value === 0 ? "text-ink-2" : value > 0 ? "text-income" : "text-expense");

  const entry = (line: StatementLine, index: number) =>
    index === 0
      ? { title: origin, note: t(purchased ? "Bought through Purchase & Sell" : "Added to the asset list") }
      : { title: t("Value update"), note: line.note && !isInitialValueNote(line.note) ? line.note : "" };
  const trend = (line: StatementLine, index: number) =>
    index === 0 ? t("Start") : !line.change ? t("Same") : t(line.change > 0 ? "Up {percent}" : "Down {percent}", { percent: percent(line.percent ?? 0) });

  const summary = [
    { label: t("{origin} value", { origin }), value: first ? money(first.value) : "—", sub: first ? t("{origin} on {date}", { origin, date: day(first.date) }) : "", tone: "text-ink" },
    { label: t("Current value"), value: last ? money(last.value) : "—", sub: updates > 0 && last ? t("Updated on {date}", { date: day(last.date) }) : t("Not updated yet"), tone: "text-ink" },
    {
      label: t("Total change"),
      value: `${signed(total)} · ${toLocaleDigits(`${total > 0 ? "+" : total < 0 ? "−" : ""}${Math.abs(totalPercent).toFixed(1)}%`, fmt)}`,
      sub: t(updates === 1 ? "{count} update" : "{count} updates", { count: formatCount(updates, fmt) }),
      tone: tone(total),
    },
  ];

  // A page of its own, so the print carries only the statement.
  function print() {
    const view = window.open("", "_blank", "width=900,height=700");
    if (!view) return;
    const rows = lines
      .map((line, index) => {
        const what = entry(line, index);
        return `<tr><td>${formatCount(index + 1, fmt)}</td><td>${escape(day(line.date))}</td><td><b>${escape(what.title)}</b>${what.note ? `<br><small>${escape(what.note)}</small>` : ""}</td><td class="n">${line.previous === null ? "—" : escape(money(line.previous))}</td><td class="n">${escape(money(line.value))}</td><td class="n">${line.change === null ? "—" : escape(signed(line.change))}</td><td>${escape(trend(line, index))}</td></tr>`;
      })
      .join("");
    const heads = ["#", t("Date"), t("Entry"), t("Previous value"), t("New value"), t("Difference"), t("Trend")].map((head, i) => `<th${i >= 3 && i <= 5 ? ' class="n"' : ""}>${escape(head)}</th>`).join("");
    const cards = summary.map((card) => `<div class="card"><small>${escape(card.label)}</small><b>${escape(card.value)}</b><small>${escape(card.sub)}</small></div>`).join("");
    view.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${escape(`${t("Asset value statement")} · ${asset!.name}`)}</title><style>body{font-family:Inter,'Hind Siliguri',system-ui,sans-serif;color:#12201d;margin:32px}h1{font-size:20px;margin:0}p{margin:4px 0 20px;color:#5f6b68}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}.card{border:1px solid #e1e7e6;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:4px}.card b{font-size:16px}small{color:#5f6b68}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:8px;border-bottom:1px solid #e1e7e6;vertical-align:top}th{background:#f4f5f5;font-size:12px}.n{text-align:right;white-space:nowrap}</style></head><body><h1>${escape(t("Asset value statement"))}</h1><p>${escape(`${asset!.name} · ${t(asset!.category)}`)}</p><div class="cards">${cards}</div><table><thead><tr>${heads}</tr></thead><tbody>${rows}</tbody></table></body></html>`,
    );
    view.document.close();
    view.focus();
    view.print();
  }

  const isSold = asset.status === "SOLD";
  // A sale closes the statement: the price it went for, against the last value.
  const sale =
    isSold && asset.soldAt && last
      ? { date: asset.soldAt, previous: last.value, value: Number(asset.soldPrice ?? 0), change: Number(asset.soldPrice ?? 0) - last.value }
      : null;
  const chip = (change: number | null, previous: number | null) => {
    if (change === null || !previous) return null;
    const pct = (change / previous) * 100;
    if (Math.abs(pct) < 0.05) return { text: "0%", tone: "bg-surface-sunken text-ink-2" };
    return { text: toLocaleDigits(`${pct > 0 ? "+" : "−"}${Math.abs(pct).toFixed(1)}%`, fmt), tone: pct > 0 ? "bg-income-soft text-income" : "bg-expense-soft text-expense" };
  };
  const difference = (change: number | null, previous: number | null) => {
    const badge = chip(change, previous);
    return (
      <span className="flex flex-col items-end gap-0.5">
        <span className={cn("font-semibold whitespace-nowrap", tone(change))}>{change === null ? "—" : signed(change)}</span>
        {badge && <span className={cn("rounded-full px-1.75 py-px text-[11px] font-bold", badge.tone)}>{badge.text}</span>}
      </span>
    );
  };
  const locked = (text: string) => <span className="text-[12px] whitespace-nowrap text-ink-faint">{t(text)}</span>;

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      width={940}
      lead={<AssetTypeTile visual={categoryVisual(categories, asset.category)} size="lg" glossy className="size-11 rounded-[12px] [&_svg]:size-5.5" />}
      title={
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[12px] font-semibold tracking-[0.04em] text-ink-muted uppercase">{t("Asset value statement")}</span>
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate">{asset.name}</span>
            <span className="shrink-0 font-medium text-ink-muted">· {t(asset.category)}</span>
            {isSold && <span className="shrink-0 rounded-full bg-surface-sunken px-2.25 py-0.5 text-[12px] font-semibold text-ink-soft">{t("Sold")}</span>}
          </span>
        </span>
      }
      actions={
        <Button variant="secondary" onClick={print} className="h-11 gap-1.5 rounded-full px-3.5 text-[13px] font-semibold max-sm:hidden">
          <Printer className="size-4" aria-hidden="true" />
          {t("Print statement")}
        </Button>
      }
      bodyClassName="gap-4 py-5"
      footerClassName="justify-between bg-surface"
      footer={
        <>
          <span className="text-[12.5px] text-ink-muted">{t(isSold ? "This asset is sold, so its history is read only." : "Every update adds a new row. The first row is where the asset starts.")}</span>
          <span className="flex gap-2.5">
            {editable && onUpdate && (
              <Button variant="secondary" onClick={onUpdate} className="h-11 rounded-full px-4.5">
                {t("Update value@@action")}
              </Button>
            )}
            <Button onClick={onClose} className="h-11 rounded-full px-5.5">
              {t("Close")}
            </Button>
          </span>
        </>
      }
    >
      <div className="grid rounded-[12px] border border-line bg-strip sm:grid-cols-3">
        {summary.map((card, index) => (
          <div key={card.label} className={cn("flex flex-col gap-0.5 px-4 py-3", index > 0 && "border-line max-sm:border-t sm:border-l")}>
            <span className="text-[12px] text-ink-muted">{card.label}</span>
            <span className={cn("text-[18px] font-bold tabular-nums", card.tone)}>{card.value}</span>
            <span className="text-[12px] text-ink-muted">{card.sub}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-[12px] border border-line">
        <div className="min-w-190">
          <div className={cn("grid items-center gap-x-3 border-b border-line bg-table-head px-4 py-2.5 text-caption font-semibold text-ink-muted", COLUMNS)}>
            <span>#</span>
            <span>{t("Date")}</span>
            <span>{t("Entry")}</span>
            <span className="text-right">{t("Previous value")}</span>
            <span className="text-right">{t("New value")}</span>
            <span className="text-right">{t("Difference")}</span>
            <span className="text-right">{t("Actions")}</span>
          </div>
          <ul>
            {lines.map((line, index) => {
              const what = entry(line, index);
              return (
                <li key={line.id} aria-busy={busyId === line.id || undefined} className={cn("grid min-h-14 items-center gap-x-3 border-b border-divider px-4 py-2 text-[13px] tabular-nums last:border-b-0", COLUMNS)}>
                  <span className="text-ink-muted">{formatCount(index + 1, fmt)}</span>
                  <span className="whitespace-nowrap text-ink-2">{day(line.date)}</span>
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className="font-semibold text-ink">{what.title}</span>
                    {what.note && (
                      <span title={what.note} className="truncate text-[12px] text-ink-muted">
                        {what.note}
                      </span>
                    )}
                  </span>
                  <span className="text-right whitespace-nowrap text-ink-soft">{line.previous === null ? "—" : money(line.previous)}</span>
                  <span className="text-right font-bold whitespace-nowrap text-ink">{money(line.value)}</span>
                  {difference(line.change, line.previous)}
                  <span className="flex justify-end gap-1.5">
                    {/* The first line is where the asset starts: its purchase is edited instead. */}
                    {index === 0 ? (
                      locked("Fixed@@history")
                    ) : editable ? (
                      <>
                        <IconAction onClick={() => openEdit(line)} disabled={isPending} aria-label={t("Edit the value update of {date}", { date: day(line.date) })} title={t("Edit")}>
                          <Pencil aria-hidden="true" />
                        </IconAction>
                        <IconAction tone="danger" onClick={() => removeLine(line)} disabled={isPending} aria-label={t("Delete the value update of {date}", { date: day(line.date) })} title={t("Delete")}>
                          {busyId === line.id && !editing ? <Loader size={14} label={t("Loading...")} /> : <Trash2 aria-hidden="true" />}
                        </IconAction>
                      </>
                    ) : (
                      locked("Read only")
                    )}
                  </span>
                </li>
              );
            })}
            {sale && (
              <li className={cn("grid min-h-14 items-center gap-x-3 px-4 py-2 text-[13px] tabular-nums", COLUMNS)}>
                <span className="text-ink-muted">{formatCount(lines.length + 1, fmt)}</span>
                <span className="whitespace-nowrap text-ink-2">{day(sale.date)}</span>
                <span className="font-semibold text-ink">{t("Sold")}</span>
                <span className="text-right whitespace-nowrap text-ink-soft">{money(sale.previous)}</span>
                <span className="text-right font-bold whitespace-nowrap text-ink">{money(sale.value)}</span>
                {difference(sale.change, sale.previous)}
                <span className="flex justify-end">{locked("Read only")}</span>
              </li>
            )}
          </ul>
        </div>
      </div>
      <PopupDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        width={420}
        title={t("Edit value update")}
        sub={asset.name}
        busy={isPending}
        onSubmit={saveEdit}
        footerClassName="bg-surface"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={isPending} className="h-11 rounded-full px-4.5">
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!formValid || isPending} className="h-11 rounded-full px-5">
              {isPending && <Loader size={16} onDark label={t("Saving...")} />}
              {t("Save changes")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="stmt-value" className="text-[14px] font-medium text-ink">
            {t("Value")}
          </label>
          <AmountInput id="stmt-value" size="sm" value={form.value} onChange={(value) => setForm({ ...form, value })} currency={currency} autoFocus />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="stmt-date" className="text-[14px] font-medium text-ink">
            {t("Update date")}
          </label>
          <DayInput id="stmt-date" size="md" value={form.date} onChange={(date) => setForm({ ...form, date })} min={bought} max={today} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="stmt-note" className="text-[14px] font-medium text-ink">
            {t("Note")} <span className="font-normal text-ink-muted">({t("optional")})</span>
          </label>
          <Input id="stmt-note" size="md" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} maxLength={200} placeholder={t("e.g. Checked with local broker")} frameClassName="rounded-[10px]" />
        </div>
      </PopupDialog>
      {confirmDialog}
    </PopupDialog>
  );
}
