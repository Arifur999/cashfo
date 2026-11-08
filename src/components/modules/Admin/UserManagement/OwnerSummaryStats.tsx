import { formatCount } from "@/lib/i18n/digits";
import { getTranslator } from "@/lib/i18n/locale";
import { plural } from "@/lib/i18n/message";
import { cn } from "@/lib/utils";
import type { IOwnerStats } from "@/types/owner.types";
import { walletKindsLabel, workspacePlanLabel } from "./peopleDisplay";

// Small figures on strip tiles, as the v16 AdminUserDetail board opens a
// person's overview: wallets by kind, transactions in the last 30 days and
// the friends they invited -- and, first, their workspaces against the plan
// for someone with more than one (the board's people have one). Counts are
// in the reader's digits.
const OwnerSummaryStats = async ({ stats }: { stats: IOwnerStats }) => {
  const { t, locale } = await getTranslator("admin");
  const count = (value: number) => formatCount(value, locale);
  const tiles = [
    ...(stats.workspaces > 1 ? [{ label: "Workspaces", value: count(stats.workspaces), sub: workspacePlanLabel(stats.workspaces, stats.workspaceLimit, t, locale) }] : []),
    { label: "Wallets", value: count(stats.wallets), sub: walletKindsLabel(stats.walletKinds, t, locale) },
    { label: "Transactions", value: count(stats.transactionsLast30d), sub: t("In the last 30 days") },
    {
      label: "Referral friends",
      value: count(stats.referralFriends),
      sub: stats.referralFriends === 0 ? t("No friends invited yet") : plural(t, stats.referralBought, "{count} bought a plan", "{count} bought a plan", undefined, locale),
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 gap-2.5", tiles.length > 3 ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
      {tiles.map((tile) => (
        <div key={tile.label} className="flex flex-col gap-0.5 rounded-[14px] border border-divider bg-strip px-3.5 py-3">
          <span className="text-caption text-ink-muted">{t(tile.label)}</span>
          <span className="text-[19px] leading-[normal] font-bold text-ink tabular-nums">{tile.value}</span>
          <span className="text-[11.5px] leading-[normal] text-ink-muted">{tile.sub}</span>
        </div>
      ))}
    </div>
  );
};

export default OwnerSummaryStats;
