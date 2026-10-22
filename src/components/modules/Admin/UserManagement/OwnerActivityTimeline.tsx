import T from "@/components/shared/T";
import { LIST_DIVIDER } from "@/components/smartly/list/recipes";
import { auditActionLabel } from "@/lib/auditActionLabels";
import { formatRelativeDay } from "@/lib/date";
import { getTranslator } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { IOwnerActivityLogEntry } from "@/types/owner.types";

// What admins did on this account, newest first: who, what, when. Rows part
// with the lists' divider; the text keeps the body's own line height, which
// gives Bangla's vowel signs room when a long action wraps.
const OwnerActivityTimeline = async ({ entries }: { entries: IOwnerActivityLogEntry[] }) => {
  const { t, locale } = await getTranslator("admin");
  return (
    <section aria-labelledby="owner-history" className="flex flex-col gap-3 rounded-lg border border-line bg-surface px-5 py-4 shadow-card">
      <h2 id="owner-history" className="text-title text-ink">
        <T>What admins did on this account</T>
      </h2>
      {entries.length === 0 ? (
        <p className="text-small text-ink-muted">
          <T>Nothing yet.</T>
        </p>
      ) : (
        <ol className="flex flex-col">
          {entries.map((entry) => (
            <li key={entry.id} className={cn("flex gap-3 border-b py-2 text-body last:border-b-0", LIST_DIVIDER)}>
              <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-emerald" />
              <span className="flex-1 text-ink">
                <b className="font-semibold">{entry.adminName}</b> <span className="text-ink-2">{t(auditActionLabel(entry.action)).toLowerCase()}</span>
              </span>
              <span className="shrink-0 text-small text-ink-muted">{formatRelativeDay(entry.createdAt, { t, locale })}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

export default OwnerActivityTimeline;
