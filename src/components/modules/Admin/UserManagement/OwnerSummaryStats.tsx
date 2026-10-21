import { formatDate, formatRelativeDay } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { getTranslator } from "@/lib/i18n/locale";
import type { IOwnerDetail } from "@/types/owner.types";
import { daysSince, daysUsedLabel, ownWorkspaceLabel } from "./peopleDisplay";

// Four small figures on strip tiles, as the design draws a person's
// overview: workspaces, plan, since when, last sign-in. Counts are in the
// reader's digits; names (workspace, plan) are data, and only the fixed
// words are translated.
const OwnerSummaryStats = async ({ owner }: { owner: IOwnerDetail }) => {
  const { t, locale } = await getTranslator("admin");
  // The workspace listed is their own personal one; the others are counted.
  const own = ownWorkspaceLabel(owner, t);
  const others = owner.workspaceCount - 1;
  const days = daysSince(owner.createdAt);
  const used = daysUsedLabel(days, t, locale);
  const tiles = [
    {
      label: "Workspaces",
      value: formatCount(owner.workspaceCount, locale),
      sub: own === null ? t("No workspace yet") : others > 0 ? t("{name} and {count} more", { name: own, count: formatCount(others, locale) }) : own,
    },
    { label: "Plan", value: owner.planName ?? t("None"), sub: t(owner.planName ? "Current plan" : "No plan on the account") },
    { label: "Member since", value: formatDate(owner.createdAt, "d MMM yyyy"), sub: days > 0 ? t("Using for {days}", { days: used }) : used },
    {
      // Set when they sign in, and a session lasts a week: it isn't when
      // they last used the app, so it doesn't say "active".
      label: "Last sign-in",
      value: owner.lastLoginAt ? formatRelativeDay(owner.lastLoginAt, { t }) : t("Never"),
      sub: t(owner.lastLoginAt ? "Changes only when they sign in" : "Has not signed in yet"),
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="flex flex-col gap-0.5 rounded-md border border-divider bg-strip px-4 py-3">
          <span className="text-caption text-ink-muted">{t(tile.label)}</span>
          <span className="truncate text-h3 text-ink tabular-nums">{tile.value}</span>
          <span className="truncate text-caption text-ink-muted" title={tile.sub}>
            {tile.sub}
          </span>
        </div>
      ))}
    </div>
  );
};

export default OwnerSummaryStats;
