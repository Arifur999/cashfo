"use client";

import { Check, Download, Lock, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import { getPrintableExportAction } from "@/lib/customer/dataPrivacyActions";
import type { ExportFormat, ExportSection, PrintableExport } from "@/lib/customer/dataPrivacyTypes";
import { fileNameFrom } from "@/lib/customer/settingsDisplay";
import { formatDay } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PrintPreview } from "../../Balance/PrintPreview";
import { PopupDialog } from "../../Shared/PopupDialog";
import { BoardSegment, CARD, CheckChip } from "../boardUi";
import { fileSizeText, saveFile } from "./dataFiles";

export const EXPORT_PARTS: { key: ExportSection; label: string }[] = [
  { key: "balance", label: "Balance" },
  { key: "ie", label: "Income & Expense" },
  { key: "budget", label: "Budget" },
  { key: "savings", label: "Savings goals" },
  { key: "loans", label: "Loans" },
  { key: "assets", label: "Assets" },
  { key: "group", label: "Group Expense" },
  { key: "events", label: "Calendar & Events" },
];
const FORMAT_NAME: Record<ExportFormat, string> = { csv: "CSV", excel: "Excel", pdf: "PDF" };
const FILE_TILE: Record<"csv" | "excel", { ext: string; className: string }> = {
  csv: { ext: "ZIP", className: "bg-income-soft text-income" },
  excel: { ext: "XLSX", className: "bg-tint-blue text-tint-blue-ink" },
};

export interface ExportChoice {
  sections: ExportSection[] | null;
  from: string;
  to: string;
}

// The query /api/account-export and the print page read.
export function exportQuery(choice: ExportChoice, format?: "csv" | "xlsx"): URLSearchParams {
  const query = new URLSearchParams();
  if (choice.sections) query.set("sections", choice.sections.join(","));
  if (choice.from && choice.to) {
    query.set("from", choice.from);
    query.set("to", choice.to);
  }
  if (format) query.set("format", format);
  return query;
}

interface Ready {
  url: string;
  name: string;
  size: number;
}

// The SettingsData board's Export card and its popup: what to take out
// (everything, or chosen sections), the format and the days; a CSV or
// Excel file is made, then downloaded; a PDF opens the print page.
export function ExportCard({ today, startSignal }: { today: string; startSignal: number }) {
  const { t, fmt } = useLocale();
  const pdfOn = useFeature("pdf_export");
  const [what, setWhat] = useState<"all" | "pick">("all");
  const [picked, setPicked] = useState<ExportSection[]>(EXPORT_PARTS.map((part) => part.key));
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [range, setRange] = useState<"all" | "period">("all");
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [phase, setPhase] = useState<"prep" | "done" | null>(null);
  const [ready, setReady] = useState<Ready | null>(null);
  const [printable, setPrintable] = useState<PrintableExport | null>(null);
  const abort = useRef<AbortController | null>(null);

  const none = what === "pick" && picked.length === 0;
  const rangeError = range !== "period" ? null : !from || !to ? "Pick both dates." : from > to ? "The start date must be before the end date." : to > today ? "The end date can’t be in the future." : null;
  const blocked = none || Boolean(rangeError);
  const choice: ExportChoice = { sections: what === "pick" ? picked : null, from: range === "period" ? from : "", to: range === "period" ? to : "" };
  const whatText = what === "all" ? t("All your data") : EXPORT_PARTS.filter((part) => picked.includes(part.key)).map((part) => t(part.label)).join(", ");
  const rangeText = range === "all" ? t("all time") : t("{from} to {to}", { from: formatDay(from, "d MMMM yyyy", fmt), to: formatDay(to, "d MMMM yyyy", fmt) });
  const summary = `${whatText} · ${FORMAT_NAME[format]} · ${rangeText}`;

  // A file made but not taken goes when the popup closes.
  useEffect(() => () => void (ready && URL.revokeObjectURL(ready.url)), [ready]);

  function close() {
    abort.current?.abort();
    setPhase(null);
    setReady(null);
  }

  async function start(override?: ExportChoice) {
    const asked = override ?? choice;
    if (!override && blocked) return;
    const kind = override ? "csv" : format;
    const controller = new AbortController();
    abort.current = controller;
    setReady(null);
    setPhase("prep");
    if (kind === "pdf") {
      const tables = await getPrintableExportAction(exportQuery(asked).toString()).catch(() => null);
      if (controller.signal.aborted) return;
      setPhase(null);
      if (!tables) return void toast.error(t("Couldn't prepare your file. Try again."));
      setPrintable(tables);
      return;
    }
    const response = await fetch(`/api/account-export?${exportQuery(asked, kind === "excel" ? "xlsx" : "csv").toString()}`, { cache: "no-store", signal: controller.signal }).catch(() => null);
    if (controller.signal.aborted) return;
    if (!response?.ok) {
      setPhase(null);
      toast.error(response?.status === 429 ? t("You just downloaded your data. Try again in a minute.") : t("Couldn't prepare your file. Try again."));
      return;
    }
    const blob = await response.blob();
    if (controller.signal.aborted) return;
    setReady({ url: URL.createObjectURL(blob), name: fileNameFrom(response.headers.get("content-disposition")) ?? `smartly-export-${today}.zip`, size: blob.size });
    setPhase("done");
  }

  // "Download my data first" from Delete my account: everything, all time.
  const lastSignal = useRef(startSignal);
  useEffect(() => {
    if (startSignal === lastSignal.current) return;
    lastSignal.current = startSignal;
    document.getElementById("sd-export")?.scrollIntoView({ behavior: "smooth", block: "start" });
    void start({ sections: null, from: "", to: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new signal starts one
  }, [startSignal]);

  const tile = ready && FILE_TILE[ready.name.endsWith(".xlsx") ? "excel" : "csv"];

  return (
    <section id="sd-export" aria-labelledby="sd-ex" className={cn(CARD, "scroll-mt-4")}>
      <div className="flex flex-col gap-0.75 px-5.5 pt-4.5 pb-3.5">
        <h2 id="sd-ex" className="text-[16px] leading-[1.35] font-semibold text-ink">
          {t("Export")}
        </h2>
        <p className="text-small leading-normal text-ink-muted">{t("Download a copy of your records to keep or to open in another app.")}</p>
      </div>
      <div className="flex flex-col gap-4 border-t border-divider px-5.5 pt-4 pb-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-2">{t("What to export")}</span>
          <BoardSegment
            value={what}
            label={t("What to export")}
            onChange={setWhat}
            options={[
              { value: "all", label: "All data" },
              { value: "pick", label: "Choose sections" },
            ]}
          />
          {what === "pick" && (
            <>
              <div role="group" aria-label={t("What to export")} className="mt-1 flex flex-wrap gap-2">
                {EXPORT_PARTS.map((part) => (
                  <CheckChip key={part.key} on={picked.includes(part.key)} label={t(part.label)} onClick={() => setPicked((now) => (now.includes(part.key) ? now.filter((key) => key !== part.key) : [...now, part.key]))} />
                ))}
              </div>
              {none && (
                <p role="alert" className="text-[12.5px] text-expense">
                  {t("Pick at least one section.")}
                </p>
              )}
            </>
          )}
        </div>
        <div className="grid grid-cols-1 items-start gap-x-7 gap-y-4 sm:grid-cols-[auto_minmax(0,1fr)]">
          <div className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-semibold text-ink-2">{t("Format")}</span>
            <BoardSegment
              value={format}
              label={t("Format")}
              onChange={setFormat}
              options={[
                { value: "csv", label: "CSV" },
                { value: "excel", label: "Excel" },
                ...(pdfOn ? [{ value: "pdf" as const, label: "PDF" }] : []),
              ]}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[12.5px] font-semibold text-ink-2">{t("Dates")}</span>
            <div className="flex flex-wrap items-center gap-2.5">
              <BoardSegment
                value={range}
                label={t("Dates")}
                onChange={setRange}
                options={[
                  { value: "all", label: "All time" },
                  { value: "period", label: "A period" },
                ]}
              />
              {range === "period" && (
                <>
                  <DayInput size="sm" value={from} max={today} onChange={setFrom} invalid={Boolean(rangeError)} className="w-42" />
                  <span className="text-small text-ink-muted">{t("to@@range")}</span>
                  <DayInput size="sm" value={to} max={today} onChange={setTo} invalid={Boolean(rangeError)} className="w-42" />
                </>
              )}
            </div>
            {rangeError && (
              <p role="alert" className="text-[12.5px] text-expense">
                {t(rangeError)}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3.5 border-t border-divider pt-3.5">
          <span className="flex min-w-0 flex-1 items-center gap-2 text-[12.5px] text-ink-muted">
            <Lock className="size-3.5 shrink-0" aria-hidden="true" />
            {t("Passwords in Password Manager are never exported.")}
          </span>
          <Button size="sm" className="h-9.5 px-3.75 text-[13.5px]" disabled={blocked} onClick={() => void start()}>
            <Download className="size-3.75" aria-hidden="true" />
            {t("Export {format}", { format: FORMAT_NAME[format] })}
          </Button>
        </div>
      </div>

      <PopupDialog
        open={phase !== null}
        onClose={close}
        plain
        width={440}
        bodyClassName="items-center gap-3 px-7 pt-7.5 pb-6 text-center"
        titleClassName="flex flex-col items-center gap-3 text-[18px] font-semibold"
        title={
          <>
            {phase === "done" ? (
              <span className="flex size-13 items-center justify-center rounded-2xl bg-income-soft text-income">
                <Check className="size-6" strokeWidth={2.4} aria-hidden="true" />
              </span>
            ) : (
              <span className="flex size-13 items-center justify-center rounded-2xl bg-mint-50 text-primary">
                <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
              </span>
            )}
            {t(phase === "done" ? "Your file is ready" : "Preparing your file")}
          </>
        }
        sub={summary}
      >
        {phase === "prep" ? (
          <div role="progressbar" aria-label={t("Preparing your file")} className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
          </div>
        ) : (
          ready &&
          tile && (
            <>
              <div className="flex w-full items-center gap-3 rounded-xl border border-line px-3.5 py-3 text-left">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[10px] text-[10.5px] font-bold", tile.className)}>{tile.ext}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13.5px] font-semibold text-ink">{ready.name}</span>
                  <span className="text-[12.5px] text-ink-muted">{`${fileSizeText(ready.size, fmt)} · ${formatDay(today, "d MMMM yyyy", fmt)}`}</span>
                </span>
              </div>
              <Button
                className="h-9.5 w-full text-[13.5px]"
                size="sm"
                onClick={() => {
                  saveFile(ready.url, ready.name);
                  toast.success(t("Download started"));
                }}
              >
                <Download className="size-3.75" aria-hidden="true" />
                {t("Download")}
              </Button>
              <button type="button" onClick={close} className="text-small font-semibold text-emerald hover:underline">
                {t("Close")}
              </button>
            </>
          )
        )}
      </PopupDialog>
      {printable && (
        <PrintPreview subtitle={summary} onClose={() => setPrintable(null)}>
          <PrintableTables data={printable} summary={summary} today={today} />
        </PrintPreview>
      )}
    </section>
  );
}

// The export on paper: each workspace, each table, as the file has them.
function PrintableTables({ data, summary, today }: { data: PrintableExport; summary: string; today: string }) {
  const { t, fmt } = useLocale();
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1 border-b border-line pb-3">
        <h1 className="text-[20px] font-bold text-ink">{t("Smartly export")}</h1>
        <span className="text-small text-ink-muted">{`${data.owner} · ${formatDay(today, "d MMMM yyyy", fmt)}`}</span>
        <span className="text-small text-ink-muted">{summary}</span>
      </header>
      {data.folders.length === 0 && <p className="text-body text-ink-muted">{t("Nothing to export in what you picked.")}</p>}
      {data.folders.map((folder) => (
        <section key={folder.folder || "account"} className="flex flex-col gap-3.5">
          {folder.folder && <h2 className="text-body-lg font-bold text-ink">{folder.folder}</h2>}
          {folder.sheets.map((sheet) => (
            <div key={sheet.name} className="flex flex-col gap-1.5 break-inside-avoid-page">
              <h3 className="text-body font-semibold text-ink">{t(sheet.name)}</h3>
              {sheet.rows.length === 0 ? (
                <p className="text-[12px] text-ink-muted">{t("No rows.")}</p>
              ) : (
                <table className="w-full border-collapse text-[10px] leading-snug">
                  <thead>
                    <tr>
                      {sheet.head.map((title) => (
                        <th key={title} className="border-b border-line px-1 py-1 text-left font-semibold text-ink-soft">
                          {t(title)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.rows.map((row, index) => (
                      <tr key={index} className="break-inside-avoid">
                        {row.map((cell, column) => (
                          <td key={column} className="border-b border-divider px-1 py-0.75 align-top wrap-break-word text-ink">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {sheet.more > 0 && <p className="text-[11px] text-ink-muted">{t("And {count} more rows: export as CSV or Excel to see them all.", { count: formatCount(sheet.more, fmt) })}</p>}
            </div>
          ))}
        </section>
      ))}
      {data.locked.length > 0 && <p className="text-small text-ink-muted">{t("Locked with a PIN, so left out: {names}", { names: data.locked.join(", ") })}</p>}
    </div>
  );
}
