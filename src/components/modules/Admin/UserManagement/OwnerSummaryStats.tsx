import { formatDate, formatRelativeDay } from "@/lib/date";
import { formatNumber } from "@/lib/number";
import type { IOwnerDetail } from "@/types/owner.types";

// Four small figures on cream tiles, as the design draws a person's
// overview: workspaces, plan, since when, last seen.
const OwnerSummaryStats = ({ owner }: { owner: IOwnerDetail }) => {
  const tiles = [
    { label: "Workspaces", value: formatNumber(owner.workspaceCount), sub: owner.businessName ?? "No workspace yet" },
    { label: "Plan", value: owner.planName ?? "None", sub: owner.planName ? "Current plan" : "No plan on the account" },
    { label: "Member since", value: formatDate(owner.createdAt, "d MMM yyyy"), sub: "Signed up" },
    { label: "Last active", value: owner.lastLoginAt ? formatRelativeDay(owner.lastLoginAt) : "Never", sub: owner.lastLoginAt ? "Last sign-in" : "Has not signed in yet" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="flex flex-col gap-0.5 rounded-md border border-surface-sunken bg-cream px-4 py-3">
          <span className="text-caption text-ink-muted">{tile.label}</span>
          <span className="truncate text-h3 text-ink tabular-nums">{tile.value}</span>
          <span className="truncate text-caption text-ink-muted">{tile.sub}</span>
        </div>
      ))}
    </div>
  );
};

export default OwnerSummaryStats;
