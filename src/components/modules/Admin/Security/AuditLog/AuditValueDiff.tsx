"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import T from "@/components/shared/T";
import { LIST_DIVIDER, LIST_HEAD } from "@/components/smartly/list/recipes";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { auditValueRows } from "./auditValueRows";

// The list recipes' head band and row divider, at the drawer's tighter 12px
// inset; the head keeps the line under it.
const HEAD = cn(LIST_HEAD, "border-b border-line px-3 py-2 text-left md:px-3");
const CELL = cn("border-t px-3 py-3 align-top break-all", LIST_DIVIDER);

// The fields an action changed, before struck out in red and after in green;
// the ones that stayed the same, and bookkeeping such as updatedAt, fold away
// behind a link.
const AuditValueDiff = ({ oldValue, newValue }: { oldValue: unknown; newValue: unknown }) => {
  const { translate, locale } = useLocale();
  const [showAll, setShowAll] = useState(false);
  const regionId = useId();
  const { all, changed, folded, foldedMoved } = auditValueRows(oldValue, newValue);
  const visible = showAll ? all : changed;
  // An absent side is a dash; a saved null reads as the On column says it.
  const shown = (value: string | undefined) => (value === undefined ? "—" : value === "null" ? translate("none") : value);

  if (all.length === 0) {
    return (
      <p className="text-small text-ink-muted">
        <T>Nothing else was saved with this entry.</T>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div id={regionId}>
        {visible.length > 0 ? (
          <div className="overflow-hidden rounded-md border border-line">
            <table className="w-full table-fixed text-small">
              <colgroup>
                <col className="w-32.5" />
                <col />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" className={HEAD}>
                    <T>Field</T>
                  </th>
                  <th scope="col" className={HEAD}>
                    <T>Before</T>
                  </th>
                  <th scope="col" className={HEAD}>
                    <T>After</T>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  // Only a real change is struck out and coloured; a timestamp
                  // that moved shows plainly.
                  const marked = row.differs && !row.quiet;
                  // A field with no Bangla yet stays marked as English.
                  const label = translate(row.label);
                  const english = locale === "bn" && label === row.label;
                  return (
                    <tr key={row.field}>
                      <th scope="row" lang={english ? "en" : undefined} title={row.field} className={cn(CELL, "text-left font-normal text-ink")}>
                        {label}
                        {/* Where a nested field sits, so limits.max and quota.max differ. */}
                        {row.field.includes(".") && (
                          <code lang="en" className="block font-mono text-caption wrap-anywhere text-ink-muted">
                            {row.field}
                          </code>
                        )}
                      </th>
                      <td className={cn(CELL, marked && row.before !== undefined ? "bg-expense-soft font-semibold text-expense" : "text-ink-2")}>
                        {marked && row.before !== undefined ? <s>{shown(row.before)}</s> : shown(row.before)}
                      </td>
                      <td className={cn(CELL, marked && row.after !== undefined ? "bg-mint-50 font-semibold text-brand-ink" : "text-ink-2")}>{shown(row.after)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-small text-ink-muted">
            <T>No field changed.</T>
          </p>
        )}
      </div>
      {folded > 0 && (
        <button
          type="button"
          aria-expanded={showAll}
          aria-controls={regionId}
          className="flex items-center gap-1 self-start text-small font-semibold text-emerald hover:underline"
          onClick={() => setShowAll((open) => !open)}
        >
          {/* Bookkeeping that moved isn't "the same", so the link says less. */}
          <T>{foldedMoved ? (showAll ? "Hide the other fields" : "Show the other fields") : showAll ? "Hide the fields that stayed the same" : "Show the fields that stayed the same"}</T>
          <ChevronDown aria-hidden="true" className={cn("size-3.5 transition-transform", showAll && "rotate-180")} />
        </button>
      )}
    </div>
  );
};

export default AuditValueDiff;
