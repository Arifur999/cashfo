import T from "@/components/shared/T";
import { auditActionLabel } from "@/lib/auditActionLabels";
import { formatDate } from "@/lib/date";
import { getTranslator } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { IOwnerActivityLogEntry } from "@/types/owner.types";
import { ownerHistoryLine, type HistoryTone } from "./peopleDisplay";

const DOT: Record<HistoryTone, string> = { expense: "bg-expense-fill", income: "bg-mint-300", warning: "bg-warning-fill", info: "bg-info" };

// What admins did on this account, newest first, as the AdminUserDetail
// board lists it: a coloured dot (red for what locks or wipes, mint for
// what gives back, amber for the plan), who, what, and the day. `limit`
// cuts the Overview's card short; the Activity tab shows it all.
const OwnerActivityTimeline = async ({ entries, limit }: { entries: IOwnerActivityLogEntry[]; limit?: number }) => {
  const { t, locale } = await getTranslator("admin");
  const shown = limit === undefined ? entries : entries.slice(0, limit);
  return (
    <section aria-labelledby="owner-history" className="flex flex-col gap-2.5 rounded-card border border-line-card bg-surface px-4.5 py-3.5 shadow-card">
      <h2 id="owner-history" className="text-title text-ink">
        <T>What admins did on this account</T>
      </h2>
      {shown.length === 0 ? (
        <p className="text-small text-ink-muted">
          <T>Nothing yet.</T>
        </p>
      ) : (
        <ol className="flex flex-col">
          {shown.map((entry) => {
            const line = ownerHistoryLine(entry.action);
            return (
              <li key={entry.id} className="flex gap-3 border-b border-divider py-2 text-[13.5px] leading-[1.45] last:border-b-0">
                <span aria-hidden="true" className={cn("mt-1.5 size-2 shrink-0 rounded-full", DOT[line?.tone ?? "info"])} />
                <span className="flex-1 text-ink">
                  <b className="font-semibold">{entry.adminName}</b> {line ? t(line.text) : t(auditActionLabel(entry.action)).toLowerCase()}
                  {/* The reason they typed, quoted as the board shows it. */}
                  {entry.reason && <span className="wrap-break-word">: “{entry.reason}”</span>}
                </span>
                <span className="shrink-0 text-[12.5px] text-ink-faint">{formatDate(entry.createdAt, "d MMM yyyy", "—", locale)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};

export default OwnerActivityTimeline;
