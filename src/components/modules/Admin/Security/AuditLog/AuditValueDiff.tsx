import { type AuditDiffRow, diffAuditValues } from "@/lib/auditDiff";
import { cn } from "@/lib/utils";

const ValueCell = ({ value, tone }: { value: string | undefined; tone?: "removed" | "added" }) => (
  <td
    className={cn(
      "px-3 py-2 align-top font-mono text-xs break-all",
      value === undefined && "text-muted-foreground",
      tone === "removed" && "text-destructive line-through",
      tone === "added" && "font-medium text-primary",
    )}
  >
    {value ?? "—"}
  </td>
);

const DiffRow = ({ row }: { row: AuditDiffRow }) => (
  <tr className={cn("border-t", row.changed && "bg-amber-50/60 dark:bg-amber-500/5")}>
    <th scope="row" className="px-3 py-2 text-left align-top font-mono text-xs font-medium text-foreground">
      {row.field}
    </th>
    <ValueCell value={row.before} tone={row.changed ? "removed" : undefined} />
    <ValueCell value={row.after} tone={row.changed ? "added" : undefined} />
  </tr>
);

// Before/after snapshot of what an admin action changed, one row per field;
// changed values are highlighted.
const AuditValueDiff = ({ oldValue, newValue }: { oldValue: unknown; newValue: unknown }) => {
  const rows = diffAuditValues(oldValue, newValue);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No further detail was recorded for this entry.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
          <tr>
            <th scope="col" className="w-1/4 px-3 py-2 text-left font-medium">
              Field
            </th>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Before
            </th>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              After
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <DiffRow key={row.field} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AuditValueDiff;
