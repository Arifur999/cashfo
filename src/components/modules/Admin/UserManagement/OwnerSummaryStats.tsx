import { formatDate, formatRelativeDay } from "@/lib/date";
import { formatNumber } from "@/lib/number";
import type { IOwnerDetail } from "@/types/owner.types";
import { getTranslator } from "@/lib/i18n/locale";

// Four small figures on cream tiles, as the design draws a person's
// overview: workspaces, plan, since when, last seen.
const OwnerSummaryStats = async ({ owner }: { owner: IOwnerDetail }) => {
  const { t } = await getTranslator("admin");
  const tiles = [
    // Names (workspace, plan) are data; only the fixed words are translated.
    { label: "Workspaces", value: formatNumber(owner.workspaceCount), sub: owner.businessName ?? t("No workspace yet") },
    { label: "Plan", value: owner.planName ?? t("None"), sub: t(owner.planName ? "Current plan" : "No plan on the account") },
    { label: "Member since", value: formatDate(owner.createdAt, "d MMM yyyy"), sub: t("Signed up") },
    {
      label: "Last active",
      value: owner.lastLoginAt ? formatRelativeDay(owner.lastLoginAt, { t }) : t("Never"),
      sub: t(owner.lastLoginAt ? "Last sign-in" : "Has not signed in yet"),
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="flex flex-col gap-0.5 rounded-md border border-surface-sunken bg-cream px-4 py-3">
          <span className="text-caption text-ink-muted">{t(tile.label)}</span>
          <span className="truncate text-h3 text-ink tabular-nums">{tile.value}</span>
          <span className="truncate text-caption text-ink-muted">{tile.sub}</span>
        </div>
      ))}
    </div>
  );
};

export default OwnerSummaryStats;
