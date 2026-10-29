"use client";

import { FileDown, Printer } from "lucide-react";
import { Drawer } from "@/components/modules/Customer/Books/shared/Drawer";
import Button from "@/components/smartly/Button";
import type { Asset, AssetCategoryOption } from "@/lib/customer/api";
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
}

const COLUMNS = "grid-cols-[32px_100px_minmax(8rem,1fr)_110px_110px_110px_84px]";

const escape = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

// An asset's value statement: where it started, where it stands, the
// whole change, and every value it was recorded at with the move from the
// one before. Print (or save as PDF) opens it on a page of its own.
export function AssetStatementDialog({ open, onClose, asset, categories, currency }: AssetStatementDialogProps) {
  const { t, fmt } = useLocale();
  if (!asset) return null;

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

  return (
    <Drawer
      open={open}
      popup
      popupClassName="w-205"
      icon={<AssetTypeTile visual={categoryVisual(categories, asset.category)} size="lg" className="rounded-field" />}
      title={asset.name}
      description={`${t("Asset value statement")} · ${t(asset.category)}`}
      onClose={onClose}
      actions={
        <span className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={print} className="rounded-full max-sm:hidden">
            <FileDown className="size-4" aria-hidden="true" />
            {t("Download PDF")}
          </Button>
          <Button variant="secondary" size="sm" onClick={print} className="rounded-full">
            <Printer className="size-4" aria-hidden="true" />
            {t("Print")}
          </Button>
        </span>
      }
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          {t("Close")}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {summary.map((card) => (
            <div key={card.label} className="flex flex-col gap-1 rounded-[14px] border border-line bg-strip px-4 py-3">
              <span className="text-caption text-ink-muted">{card.label}</span>
              <span className={cn("text-[18px] font-bold tabular-nums", card.tone)}>{card.value}</span>
              <span className="text-caption text-ink-muted">{card.sub}</span>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-[14px] border border-line">
          <div className="min-w-180">
            <div className={cn("grid items-center gap-x-3 bg-table-head px-4 py-2.5 text-caption font-semibold text-ink-muted", COLUMNS)}>
              <span>#</span>
              <span>{t("Date")}</span>
              <span>{t("Entry")}</span>
              <span className="text-right">{t("Previous value")}</span>
              <span className="text-right">{t("New value")}</span>
              <span className="text-right">{t("Difference")}</span>
              <span>{t("Trend")}</span>
            </div>
            <ul>
              {lines.map((line, index) => {
                const what = entry(line, index);
                return (
                  <li key={line.id} className={cn("grid items-center gap-x-3 border-t border-divider px-4 py-2.5 text-small", COLUMNS)}>
                    <span className="text-ink-muted tabular-nums">{formatCount(index + 1, fmt)}</span>
                    <span className="whitespace-nowrap text-ink-2 tabular-nums">{day(line.date)}</span>
                    <span className="flex min-w-0 flex-col">
                      <span className="font-semibold text-ink">{what.title}</span>
                      {what.note && <span className="line-clamp-2 text-caption text-ink-muted">{what.note}</span>}
                    </span>
                    <span className="text-right text-ink-2 tabular-nums">{line.previous === null ? "—" : money(line.previous)}</span>
                    <span className="text-right font-semibold text-ink tabular-nums">{money(line.value)}</span>
                    <span className={cn("text-right font-semibold whitespace-nowrap tabular-nums", tone(line.change))}>{line.change === null ? "—" : signed(line.change)}</span>
                    <span>
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-caption font-semibold", index === 0 || !line.change ? "bg-surface-sunken text-ink-2" : line.change > 0 ? "bg-income-soft text-income" : "bg-expense-soft text-expense")}>
                        {trend(line, index)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
