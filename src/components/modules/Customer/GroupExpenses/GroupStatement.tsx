"use client";

import { FileDown, Printer } from "lucide-react";
import Button from "@/components/smartly/Button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export interface StatementColumn {
  label: string;
  end?: boolean;
}

export interface StatementSpec {
  // "Expense statement"
  title: string;
  // The toolbar's line: "October 2026 · All categories".
  sub: string;
  // "Mirpur Family · Family group"
  group: string;
  // "Generated 30 Oct 2026"
  generated: string;
  meta: { label: string; value: string }[];
  // Boxed figures (the cash book's Opening / Money in / Money out / Closing).
  boxes?: { label: string; value: string }[];
  // Small lists before the table ("By category": "Rent · 2 · 60%  ৳ 24,000").
  blocks?: { title?: string; items: { label: string; detail?: string; value: string }[] }[];
  columns: StatementColumn[];
  // A first and last row set apart (Opening / Closing balance, Total).
  lead?: string[];
  rows: string[][];
  tail?: string[];
  empty: string;
  footer: string;
}

const escape = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

// A group statement (the v7 boards' print preview): an A4 page with the
// group, the period and its figures, and every entry. Print and Download
// PDF open the same page on its own, so only the statement prints.
export function GroupStatement({ open, onClose, spec, tools }: { open: boolean; onClose: () => void; spec: StatementSpec | null; tools?: React.ReactNode }) {
  const { t } = useLocale();
  if (!spec) return null;

  function print() {
    if (!spec) return;
    const view = window.open("", "_blank", "width=900,height=760");
    if (!view) return;
    const cell = (value: string, i: number, tag = "td") => `<${tag}${spec.columns[i]?.end ? ' class="n"' : ""}>${escape(value)}</${tag}>`;
    const line = (values: string[], cls = "") => `<tr${cls ? ` class="${cls}"` : ""}>${values.map((value, i) => cell(value, i)).join("")}</tr>`;
    const meta = spec.meta.map((item) => `<div><small>${escape(item.label)}</small><b>${escape(item.value)}</b></div>`).join("");
    const boxes = spec.boxes ? `<div class="boxes">${spec.boxes.map((box) => `<div class="box"><small>${escape(box.label)}</small><b>${escape(box.value)}</b></div>`).join("")}</div>` : "";
    const blocks = (spec.blocks ?? [])
      .map((block) => `${block.title ? `<h3>${escape(block.title)}</h3>` : ""}<div class="items">${block.items.map((item) => `<div class="item"><span>${escape(item.label)}${item.detail ? ` <small>${escape(item.detail)}</small>` : ""}</span><b>${escape(item.value)}</b></div>`).join("")}</div>`)
      .join("");
    const body = spec.rows.length === 0 ? `<tr><td colspan="${spec.columns.length}" class="empty">${escape(spec.empty)}</td></tr>` : spec.rows.map((values) => line(values)).join("");
    view.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${escape(`${spec.title} · ${spec.group}`)}</title><style>
body{font-family:Inter,'Hind Siliguri',system-ui,sans-serif;color:#12201d;margin:32px;font-size:13px}
header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1c7567;padding-bottom:12px;margin-bottom:16px}
.brand{font-size:20px;font-weight:700;color:#1c7567}.right{text-align:right}small{color:#5f6b68;display:block}
.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}.meta b{font-size:14px}
.boxes{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}.box{border:1px solid #e1e7e6;border-radius:10px;padding:10px}.box b{font-size:15px}
h3{font-size:13px;margin:12px 0 6px}.items{display:grid;grid-template-columns:repeat(2,1fr);gap:4px 16px;margin-bottom:12px}.item{display:flex;justify-content:space-between;gap:8px}.item small{display:inline}
table{width:100%;border-collapse:collapse;margin-top:8px}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid #e1e7e6;vertical-align:top}th{background:#f4f5f5;font-size:12px}
.n{text-align:right;white-space:nowrap}.set td{background:#f7f9f8;font-weight:700}.empty{text-align:center;color:#5f6b68;padding:24px}
footer{display:flex;justify-content:space-between;margin-top:20px;color:#5f6b68;font-size:12px}
</style></head><body><header><div><div class="brand">Smartly</div><small>${escape(spec.group)}</small></div><div class="right"><b>${escape(spec.title)}</b><small>${escape(spec.generated)}</small></div></header>
<div class="meta">${meta}</div>${boxes}${blocks}<table><thead><tr>${spec.columns.map((column, i) => cell(column.label, i, "th")).join("")}</tr></thead><tbody>${spec.lead ? line(spec.lead, "set") : ""}${body}${spec.tail ? line(spec.tail, "set") : ""}</tbody></table>
<footer><span>${escape(spec.footer)}</span><span>${escape(t("Page 1 of 1"))}</span></footer></body></html>`,
    );
    view.document.close();
    view.focus();
    view.print();
  }

  const cellClass = (i: number) => cn("px-2 py-1.5", spec.columns[i]?.end && "text-right whitespace-nowrap");

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent className="flex max-h-[calc(100vh-32px)] w-200 max-w-[calc(100vw-32px)] flex-col gap-0 overflow-hidden rounded-xl border border-line bg-surface-sunken p-0 shadow-overlay ring-0">
        <div role="toolbar" aria-label={spec.title} className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-5 py-3.5">
          <div className="flex min-w-0 flex-1 flex-col">
            <AlertDialogTitle className="text-body-lg font-semibold text-ink">{spec.title}</AlertDialogTitle>
            <AlertDialogDescription className="truncate text-caption text-ink-muted">{spec.sub}</AlertDialogDescription>
          </div>
          {tools}
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t("Close")}
          </Button>
          <Button variant="secondary" size="sm" onClick={print} className="max-sm:hidden">
            <FileDown aria-hidden="true" />
            {t("Download PDF")}
          </Button>
          <Button size="sm" onClick={print}>
            <Printer aria-hidden="true" />
            {t("Print")}
          </Button>
        </div>
        <div className="overflow-auto p-4 md:p-6">
          <article aria-label={spec.title} className="mx-auto flex min-w-170 max-w-190 flex-col gap-4 rounded-md bg-surface p-8 text-small text-ink shadow-card">
            <header className="flex items-start justify-between gap-4 border-b-2 border-emerald pb-3">
              <div className="flex flex-col">
                <span className="text-[20px] font-bold text-emerald">Smartly</span>
                <span className="text-caption text-ink-muted">{spec.group}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-bold">{spec.title}</span>
                <span className="text-caption text-ink-muted">{spec.generated}</span>
              </div>
            </header>
            <div className="grid grid-cols-4 gap-3">
              {spec.meta.map((item) => (
                <div key={item.label} className="flex flex-col">
                  <span className="text-caption text-ink-muted">{item.label}</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
            {spec.boxes && (
              <div className="grid grid-cols-4 gap-2.5">
                {spec.boxes.map((box) => (
                  <div key={box.label} className="flex flex-col rounded-lg border border-line px-3 py-2">
                    <span className="text-caption text-ink-muted">{box.label}</span>
                    <span className="font-bold tabular-nums">{box.value}</span>
                  </div>
                ))}
              </div>
            )}
            {(spec.blocks ?? []).map((block, index) => (
              <div key={block.title ?? index} className="flex flex-col gap-1.5">
                {block.title && <span className="text-caption font-semibold">{block.title}</span>}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {block.items.map((item) => (
                    <div key={`${item.label}${item.detail ?? ""}`} className="flex justify-between gap-2">
                      <span>
                        {item.label}
                        {item.detail && <span className="text-ink-muted"> {item.detail}</span>}
                      </span>
                      <span className="font-semibold tabular-nums">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <table className="w-full border-collapse tabular-nums">
              <thead>
                <tr className="bg-surface-sunken text-caption font-semibold text-ink-muted">
                  {spec.columns.map((column, i) => (
                    <th key={column.label || i} className={cellClass(i)}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {spec.lead && (
                  <tr className="bg-strip font-semibold">
                    {spec.lead.map((value, i) => (
                      <td key={i} className={cellClass(i)}>
                        {value}
                      </td>
                    ))}
                  </tr>
                )}
                {spec.rows.length === 0 ? (
                  <tr>
                    <td colSpan={spec.columns.length} className="px-2 py-6 text-center text-ink-muted">
                      {spec.empty}
                    </td>
                  </tr>
                ) : (
                  spec.rows.map((values, r) => (
                    <tr key={r} className="border-b border-line">
                      {values.map((value, i) => (
                        <td key={i} className={cellClass(i)}>
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
                {spec.tail && (
                  <tr className="bg-strip font-semibold">
                    {spec.tail.map((value, i) => (
                      <td key={i} className={cellClass(i)}>
                        {value}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
            <footer className="flex justify-between gap-4 pt-2 text-caption text-ink-muted">
              <span>{spec.footer}</span>
              <span>{t("Page 1 of 1")}</span>
            </footer>
          </article>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
