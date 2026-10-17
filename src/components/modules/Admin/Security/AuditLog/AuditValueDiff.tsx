"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { type AuditDiffRow, diffAuditValues } from "@/lib/auditDiff";
import { cn } from "@/lib/utils";

const HEAD = "bg-cream px-3 py-2 text-left font-semibold text-ink-muted";
const CELL = "border-t border-line px-3 py-3 align-top break-all";

// Added and removed fields count as changes too.
const differs = (row: AuditDiffRow) => row.before !== row.after;

// The fields an action changed, before struck out in red and after in green;
// the ones that stayed the same fold away behind a link.
const AuditValueDiff = ({ oldValue, newValue }: { oldValue: unknown; newValue: unknown }) => {
  const [showSame, setShowSame] = useState(false);
  const rows = diffAuditValues(oldValue, newValue);
  const changed = rows.filter(differs);
  const sameCount = rows.length - changed.length;
  const visible = showSame ? rows : changed;

  if (rows.length === 0) {
    return <p className="text-small text-ink-muted">Nothing else was saved with this entry.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
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
                  Field
                </th>
                <th scope="col" className={HEAD}>
                  Before
                </th>
                <th scope="col" className={HEAD}>
                  After
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.field}>
                  <th scope="row" className={cn(CELL, "text-left font-mono font-normal text-ink")}>
                    {row.field}
                  </th>
                  <td className={cn(CELL, differs(row) && row.before !== undefined ? "bg-expense-soft font-semibold text-expense" : "text-ink-2")}>
                    {differs(row) && row.before !== undefined ? <s>{row.before}</s> : (row.before ?? "—")}
                  </td>
                  <td className={cn(CELL, differs(row) && row.after !== undefined ? "bg-mint-50 font-semibold text-brand-ink" : "text-ink-2")}>{row.after ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-small text-ink-muted">No field changed.</p>
      )}
      {sameCount > 0 && (
        <button type="button" className="flex items-center gap-1 self-start text-small font-semibold text-emerald hover:underline" onClick={() => setShowSame((shown) => !shown)}>
          {showSame ? "Hide the fields that stayed the same" : "Show the fields that stayed the same"}
          <ChevronDown aria-hidden="true" className={cn("size-3.5 transition-transform", showSame && "rotate-180")} />
        </button>
      )}
    </div>
  );
};

export default AuditValueDiff;
