"use client";

import { useId } from "react";
import { isInitialValueNote, type TimelineEntry } from "@/lib/customer/assetDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface AssetValueHistoryProps {
  // valueTimeline(): newest first, the purchase last.
  entries: TimelineEntry[];
  currency: string;
  // "YYYY-MM-DD": a new value dated this day reads "Today".
  today: string;
}

// Every value an asset was recorded at, as a timeline: the value about to
// be saved (dashed), the checks, and the purchase at the bottom.
export function AssetValueHistory({ entries, currency, today }: AssetValueHistoryProps) {
  const { t, fmt } = useLocale();
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col">
      <h3 id={id} className="mb-2 text-body font-semibold text-ink">
        {t("Value history")}
      </h3>
      <ol className="flex flex-col">
        {entries.map((entry, index) => {
          const date = formatDate(entry.date, "d MMM yyyy", fmt);
          const label = entry.kind === "new" ? t(entry.date === today ? "Today, {date} · new" : "{date} · new", { date }) : date;
          // The backend's own first-row notes read as "Bought".
          const note = entry.kind === "new" ? entry.note || t("This update") : isInitialValueNote(entry.note) || (entry.kind === "first" && !entry.note) ? t("Bought") : entry.note || t("Checked");
          return <HistoryRow key={entry.id} date={label} note={note} value={formatCurrency(entry.value, currency, fmt)} kind={entry.kind} line={index < entries.length - 1} />;
        })}
      </ol>
    </section>
  );
}

// One point on the timeline: the dot, the date and note, the value.
function HistoryRow({ date, note, value, kind, line }: { date: string; note: string; value: string; kind: TimelineEntry["kind"]; line: boolean }) {
  return (
    <li className="flex gap-3">
      <div aria-hidden="true" className="flex w-3.5 flex-col items-center">
        <span className={cn("mt-1 size-3 shrink-0 rounded-full border-2", kind === "new" ? "border-dashed border-emerald bg-surface" : kind === "first" ? "border-ink-muted bg-surface" : "border-emerald bg-emerald")} />
        {line && <span className="min-h-6.5 w-0.5 flex-1 bg-surface-sunken" />}
      </div>
      <div className="flex min-w-0 flex-1 justify-between gap-3 pb-3">
        <span className="flex min-w-0 flex-col gap-px">
          <span className={cn("text-small", kind === "new" ? "font-semibold text-emerald" : "font-medium text-ink")}>{date}</span>
          <span className="truncate text-caption font-normal text-ink-muted">{note}</span>
        </span>
        <span className={cn("text-body font-semibold tabular-nums", kind === "new" ? "text-emerald" : "text-ink")}>{value}</span>
      </div>
    </li>
  );
}
