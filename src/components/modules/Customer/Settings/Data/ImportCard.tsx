"use client";

import { ArrowRight, Check, FileText, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import Button from "@/components/smartly/Button";
import { formatCurrency } from "@/lib/customer/currency";
import { autoMap, IMPORT_CHUNK, IMPORT_FIELDS, missingFields, reviewImport, sampleFile, TEMPLATE_CSV, type ColumnMap, type ImportFile, type ImportProblem } from "@/lib/customer/dataImport";
import { importRowsAction } from "@/lib/customer/dataPrivacyActions";
import type { ImportContext, ImportResult } from "@/lib/customer/dataPrivacyTypes";
import { formatDay } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PopupDialog } from "../../Shared/PopupDialog";
import { CARD, SELECT } from "../boardUi";
import { fileSizeText, keyOf, readImportFile, type ImportReadError } from "./dataFiles";

const READ_ERRORS: Record<ImportReadError | "none", string> = {
  type: "Use a CSV or Excel file (.csv or .xlsx).",
  old: "Old Excel files (.xls) can't be read. Save it as .xlsx or .csv and try again.",
  size: "The file is over 5 MB. Split it into smaller files.",
  empty: "We could not find any rows in this file.",
  many: "This file has more than 5,000 rows. Split it into smaller files.",
  none: "Choose a file first.",
};
const TEMPLATE_HREF = `data:text/csv;charset=utf-8,${encodeURIComponent(`﻿${TEMPLATE_CSV}`)}`;
const STEPS = ["Upload", "Match columns", "Review"];
const HEAD = "bg-strip text-[11.5px] font-semibold tracking-[0.04em] text-ink-muted uppercase";

// The dashed box a file is dropped on or picked from.
function DropZone({ onFile, onPick, disabled }: { onFile: (file: File) => void; onPick: () => void; disabled?: boolean }) {
  const { t } = useLocale();
  const [over, setOver] = useState(false);
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={t("Drop a file here or click to choose")}
      onClick={() => !disabled && onPick()}
      onKeyDown={(event) => {
        if (!disabled && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onPick();
        }
      }}
      onDragOver={(event) => {
        if (disabled) return;
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const file = event.dataTransfer.files[0];
        if (file && !disabled) onFile(file);
      }}
      className={cn("flex flex-col items-center gap-2 rounded-[14px] border-[1.5px] border-dashed p-5.5 text-center transition-colors", disabled ? "cursor-not-allowed border-line bg-surface-sunken opacity-60" : "cursor-pointer border-mint-200 bg-mint-50/40 hover:border-primary hover:bg-mint-50", over && "border-primary bg-mint-50")}
    >
      <span className="flex size-10.5 items-center justify-center rounded-xl border border-line bg-surface text-primary">
        <Upload className="size-4.5" aria-hidden="true" />
      </span>
      <span className="text-body font-semibold text-ink">{t("Drop a file here or click to choose")}</span>
      <span className="text-[12.5px] text-ink-muted">{t("CSV or XLSX, up to 5 MB")}</span>
    </div>
  );
}

// The SettingsData board's Import card and its popup: a file in, its
// columns matched to Smartly's, the rows checked, then added to the open
// workspace's Income & Expense, marked as imported.
export function ImportCard({ businessId, context, today, readOnly, onImported }: { businessId: string | null; context: ImportContext | null; today: string; readOnly: boolean; onImported: () => void }) {
  const { t, fmt } = useLocale();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<ImportFile | null>(null);
  const [map, setMap] = useState<ColumnMap | null>(null);
  const [error, setError] = useState<ImportReadError | "none" | null>(null);
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<(ImportResult & { failed: boolean }) | null>(null);

  const usable = Boolean(businessId && context) && !readOnly;
  const wallets = context?.wallets ?? [];
  const review = step >= 3 && file && map ? reviewImport(file, map, { wallets, today }) : { good: [], bad: [] as ImportProblem[] };
  const missing = map ? missingFields(map) : [];

  function begin(next: ImportFile | ImportReadError) {
    setOpen(true);
    setStep(1);
    setTried(false);
    setResult(null);
    if (typeof next === "string") {
      setFile(null);
      setError(next);
      return;
    }
    setFile(next);
    setMap(autoMap(next.head));
    setError(null);
  }
  const take = async (chosen: File) => begin(await readImportFile(chosen));
  const pick = () => {
    if (!input.current) return;
    input.current.value = "";
    input.current.click();
  };
  async function trySample() {
    const sample = sampleFile(today, wallets);
    begin({ ...sample, key: await keyOf(JSON.stringify(sample.rows)) });
  }

  async function send() {
    if (!businessId || !file || review.good.length === 0) return;
    const rows = review.good;
    const total: ImportResult & { failed: boolean } = { added: 0, already: 0, skipped: [], failed: false };
    setSending({ done: 0, total: rows.length });
    for (let at = 0; at < rows.length; at += IMPORT_CHUNK) {
      const part = await importRowsAction(businessId, { fileName: file.name, fileKey: file.key, rows: rows.slice(at, at + IMPORT_CHUNK) }).catch(() => null);
      if (!part?.success || !part.data) {
        total.failed = true;
        break;
      }
      total.added += part.data.added;
      total.already += part.data.already;
      total.skipped.push(...part.data.skipped);
      setSending({ done: Math.min(rows.length, at + IMPORT_CHUNK), total: rows.length });
    }
    setSending(null);
    setResult(total);
    setStep(4);
    if (total.added > 0) onImported();
  }

  function next() {
    if (step === 1) {
      if (!file) return setError(error ?? "none");
      return setStep(2);
    }
    if (step === 2) {
      if (missing.length > 0) return setTried(true);
      return setStep(3);
    }
    if (step === 3) return void send();
    setOpen(false);
  }

  const nextLabel = step === 1 ? t("Next: match columns") : step === 2 ? t("Next: review") : step === 3 ? t("Import {count} rows", { count: formatCount(review.good.length, fmt) }) : t("Done");
  const first = file?.rows.find((row) => row.some((cell) => cell.trim() !== "")) ?? [];

  return (
    <section aria-labelledby="sd-im" className={CARD}>
      <div className="flex flex-wrap items-start gap-4 px-5.5 pt-4.5 pb-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.75">
          <h2 id="sd-im" className="text-[16px] leading-[1.35] font-semibold text-ink">
            {t("Import")}
          </h2>
          <p className="text-small leading-normal text-ink-muted">{t("Bring in transactions from a CSV or Excel file, like a bank statement.")}</p>
        </div>
        <Button asChild variant="secondary" size="sm" className="h-8.5 px-3.5 text-small">
          <a href={TEMPLATE_HREF} download="smartly-import-template.csv">
            <FileText className="size-3.75" aria-hidden="true" />
            {t("Download the template")}
          </a>
        </Button>
      </div>
      <div className="px-5.5 pb-5">
        <DropZone onFile={(chosen) => void take(chosen)} onPick={pick} disabled={!usable} />
        <input ref={input} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => event.target.files?.[0] && void take(event.target.files[0])} />
        <div className="mt-3 flex flex-wrap items-center gap-2.5 text-[12.5px] text-ink-muted">
          <span className="min-w-0 flex-1">
            {!context
              ? t("Only the owner or an accountant of this workspace can import into it.")
              : context.imported > 0
                ? t("{count} transactions imported so far.", { count: formatCount(context.imported, fmt) })
                : t("Nothing imported yet.")}
          </span>
          {usable && (
            <button type="button" onClick={() => void trySample()} className="text-small font-semibold text-emerald hover:underline">
              {t("Try it with a sample file")}
            </button>
          )}
        </div>
      </div>

      <PopupDialog
        open={open}
        onClose={() => setOpen(false)}
        busy={sending !== null}
        width={620}
        title={t("Import")}
        bodyClassName="gap-3.5 px-6 py-5"
        footer={
          <>
            {(step === 2 || step === 3) && (
              <Button variant="secondary" size="sm" className="mr-auto h-9.5 text-[13.5px]" disabled={sending !== null} onClick={() => setStep(step - 1)}>
                {t("Back")}
              </Button>
            )}
            {step < 4 && (
              <Button variant="secondary" size="sm" className="h-9.5 text-[13.5px]" disabled={sending !== null} onClick={() => setOpen(false)}>
                {t("Cancel")}
              </Button>
            )}
            <Button size="sm" className="h-9.5 text-[13.5px]" disabled={(step === 3 && review.good.length === 0) || sending !== null} onClick={next}>
              {sending ? t("Importing… {done} of {total}", { done: formatCount(sending.done, fmt), total: formatCount(sending.total, fmt) }) : nextLabel}
            </Button>
          </>
        }
      >
        {step < 4 && (
          <ol className="flex items-center gap-2 text-[12.5px] font-semibold">
            {STEPS.map((label, index) => {
              const number = index + 1;
              const done = number < step;
              const on = number === step;
              return (
                <li key={label} className={cn("flex items-center gap-2", index < STEPS.length - 1 && "flex-1")}>
                  <span className={cn("inline-flex items-center gap-1.75 whitespace-nowrap", on || done ? "text-ink" : "text-ink-faint")}>
                    <span aria-hidden="true" className={cn("flex size-5.5 items-center justify-center rounded-full text-[11.5px] font-bold", on ? "bg-primary text-white" : done ? "bg-income-soft text-income" : "bg-surface-sunken text-ink-muted")}>
                      {done ? <Check className="size-3" strokeWidth={3} /> : formatCount(number, fmt)}
                    </span>
                    {t(label)}
                  </span>
                  {index < STEPS.length - 1 && <span aria-hidden="true" className="h-px min-w-4.5 flex-1 bg-line" />}
                </li>
              );
            })}
          </ol>
        )}

        {step === 1 && (
          <>
            {file ? (
              <div className="flex items-center gap-3 rounded-xl border border-line p-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-income-soft text-[10.5px] font-bold text-income">{file.ext}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body font-semibold text-ink">{file.name}</span>
                  <span className="text-[12.5px] text-ink-muted">
                    {t("{size} · {rows} rows · {columns} columns", { size: fileSizeText(file.size, fmt), rows: formatCount(file.rows.filter((row) => row.some((cell) => cell.trim() !== "")).length, fmt), columns: formatCount(file.head.length, fmt) })}
                  </span>
                </span>
                <Button variant="secondary" size="sm" className="h-8.5 text-small" onClick={pick}>
                  {t("Choose another")}
                </Button>
              </div>
            ) : (
              <DropZone onFile={(chosen) => void take(chosen)} onPick={pick} />
            )}
            {error && (
              <p role="alert" className="text-[12.5px] text-expense">
                {t(READ_ERRORS[error])}
              </p>
            )}
            <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t("The first row should hold the column names. You match them to Smartly in the next step.")}</span>
          </>
        )}

        {step === 2 && file && map && (
          <>
            <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t("Tell us which column in your file holds each detail. Fields with * are needed.")}</span>
            <div className="overflow-hidden rounded-xl border border-line-card">
              <div className={cn("grid grid-cols-[110px_minmax(0,1fr)] gap-3 px-3.5 py-2 sm:grid-cols-[150px_200px_minmax(0,1fr)]", HEAD)}>
                <span>{t("In Smartly")}</span>
                <span>{t("Column in your file")}</span>
                <span className="hidden sm:block">{t("First row")}</span>
              </div>
              {IMPORT_FIELDS.map((field) => {
                const column = map[field.key];
                const wrong = tried && field.required && !column;
                return (
                  <div key={field.key} className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3 border-t border-divider px-3.5 py-2 sm:grid-cols-[150px_200px_minmax(0,1fr)]">
                    <span className="text-[13.5px] font-semibold text-ink">
                      {t(field.label)}
                      {field.required && <span className="text-expense"> *</span>}
                    </span>
                    <select aria-label={t(field.label)} value={column} onChange={(event) => setMap({ ...map, [field.key]: event.target.value })} className={cn(SELECT, "h-8.5 min-w-0", wrong && "border-expense")}>
                      <option value="">{t("Don’t import")}</option>
                      {file.head.map((name, index) => (
                        <option key={index} value={String(index)}>
                          {name || t("Column {n}", { n: formatCount(index + 1, fmt) })}
                        </option>
                      ))}
                    </select>
                    <span className="hidden truncate text-[12.5px] text-ink-muted sm:block">{column !== "" ? first[Number(column)] || "–" : "–"}</span>
                  </div>
                );
              })}
            </div>
            {tried && missing.length > 0 && (
              <p role="alert" className="text-[12.5px] text-expense">
                {t("Match a column for: {fields}", { fields: missing.map((field) => t(field.label)).join(", ") })}
              </p>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-0.75 rounded-xl border border-income/25 bg-income-soft/60 p-3">
                <span className="text-[24px] font-bold text-income">{formatCount(review.good.length, fmt)}</span>
                <span className="text-[12.5px] text-income">{t("rows to add")}</span>
              </div>
              <div className={cn("flex flex-col gap-0.75 rounded-xl border p-3", review.bad.length > 0 ? "border-expense/25 bg-expense-soft/60 text-expense" : "border-line-card bg-strip text-ink-muted")}>
                <span className="text-[24px] font-bold">{formatCount(review.bad.length, fmt)}</span>
                <span className="text-[12.5px]">{t("rows with errors")}</span>
              </div>
            </div>
            {review.bad.length > 0 && (
              <>
                <ProblemList problems={review.bad} />
                <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t("Rows with errors are skipped. Fix them in your file and import that part again.")}</span>
              </>
            )}
            {review.good.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-line-card">
                <div className={cn("px-3.5 py-2", HEAD)}>{t("First rows to add")}</div>
                {review.good.slice(0, 3).map((row) => (
                  <div key={row.row} className="grid grid-cols-[110px_minmax(0,1fr)_110px] items-center gap-2.5 border-t border-divider px-3.5 py-2 text-[13px] sm:grid-cols-[130px_minmax(0,1fr)_110px]">
                    <span className="text-ink-muted">{formatDay(row.date, "d MMMM yyyy", fmt)}</span>
                    <span className="truncate text-ink">{row.note || row.category || "–"}</span>
                    <span className={cn("text-right font-semibold tabular-nums", row.type === "INCOME" ? "text-income" : "text-expense")}>{`${row.type === "INCOME" ? "" : "−"}${formatCurrency(row.amount, "BDT", fmt)}`}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {step === 4 && result && (
          <div className="flex flex-col items-center gap-2.5 px-0 pt-3 pb-1 text-center">
            <span className={cn("flex size-13 items-center justify-center rounded-2xl", result.failed && result.added === 0 ? "bg-expense-soft text-expense" : "bg-income-soft text-income")}>
              <Check className="size-6" strokeWidth={2.4} aria-hidden="true" />
            </span>
            <span className="text-[18px] font-semibold text-ink">{t("{count} transactions added", { count: formatCount(result.added, fmt) })}</span>
            <span className="text-[13.5px] leading-[1.55] text-ink-soft">{t("They are in Income & Expense now, marked as imported, so you can find them later.")}</span>
            {result.already > 0 && <span className="text-[13px] text-ink-muted">{t("{count} rows were already in from this file, so they were not added again.", { count: formatCount(result.already, fmt) })}</span>}
            {result.failed && <span className="text-[13px] text-expense">{t("The import stopped part way. Import the same file again to add the rest; nothing is added twice.")}</span>}
            {result.skipped.length > 0 && (
              <div className="w-full text-left">
                <ProblemList problems={result.skipped.map((row) => ({ row: row.row, reason: row.reason }))} />
              </div>
            )}
            <Link href="/transactions" className="inline-flex items-center gap-1.25 text-small font-semibold text-emerald hover:underline">
              {t("See them in Transactions")}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        )}
      </PopupDialog>
    </section>
  );
}

// The first five rows that can't go in, and why.
function ProblemList({ problems }: { problems: ImportProblem[] }) {
  const { t, fmt } = useLocale();
  return (
    <div className="overflow-hidden rounded-xl border border-expense/30">
      {problems.slice(0, 5).map((problem, index) => (
        <div key={`${problem.row}-${index}`} className="flex gap-3 border-t border-expense/15 bg-expense-soft/30 px-3.5 py-2.25 text-[13px] first:border-t-0">
          <span className="w-16 shrink-0 font-semibold text-expense">{t("Row {n}", { n: formatCount(problem.row, fmt) })}</span>
          <span className="text-ink-2">{t(problem.reason, { value: problem.value ?? "" })}</span>
        </div>
      ))}
      {problems.length > 5 && <div className="border-t border-expense/15 px-3.5 py-2 text-[12.5px] text-ink-muted">{t("And {count} more", { count: formatCount(problems.length - 5, fmt) })}</div>}
    </div>
  );
}
