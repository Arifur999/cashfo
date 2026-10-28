import { Mail, Smartphone } from "lucide-react";
import PlanChipCell from "@/components/shared/cell/PlanChipCell";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { formatDate, formatRelativeDateTime } from "@/lib/date";
import { getTranslator } from "@/lib/i18n/locale";
import { getInitials } from "@/lib/text";
import type { IOwnerDetail } from "@/types/owner.types";
import { daysSince, daysUsedLabel } from "./peopleDisplay";
import { OWNER_STATUS_LABEL } from "./usersTable.config";

interface OwnerProfileHeaderProps {
  owner: IOwnerDetail;
  actions: React.ReactNode;
}

// Who this is, in one card, as the AdminUserDetail board heads the page:
// 58px initials, the name with status and plan, then how to reach them,
// since when they are a member and when they were last active; the
// actions on the right.
const OwnerProfileHeader = async ({ owner, actions }: OwnerProfileHeaderProps) => {
  const { t, locale } = await getTranslator("admin");
  const days = daysSince(owner.createdAt);
  const member = t("Member since {date} · {days}", { date: formatDate(owner.createdAt, "d MMM yyyy", "—", locale), days: daysUsedLabel(days, t, locale) });
  const lastActive = owner.lastLoginAt
    ? t("Last active {when}", { when: formatRelativeDateTime(owner.lastLoginAt, { t, locale }).replace(/^(Today|Yesterday)/, (word) => word.toLowerCase()) })
    : t("Never signed in");

  return (
    <section aria-label={owner.name} className="flex flex-col gap-4 rounded-card border border-line-card bg-surface px-5 py-4.5 shadow-card lg:flex-row lg:items-center">
      <span aria-hidden="true" className="flex size-14.5 shrink-0 items-center justify-center rounded-full bg-mint-50 text-[19px] leading-[normal] font-bold text-brand-ink">
        {getInitials(owner.name) || "?"}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="min-w-0 text-[22px] leading-[1.3] font-semibold tracking-[-0.02em] text-ink wrap-anywhere">{owner.name}</h1>
          <StatusBadgeCell status={owner.status} label={OWNER_STATUS_LABEL[owner.status]} dot className="px-2.25" />
          {/* The plan's own colour, as on every list: Free grey, Business amber. */}
          {owner.planName && <PlanChipCell plan={owner.planName} />}
        </div>
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-small text-ink-soft">
          {/* A long address breaks anywhere on a phone instead of widening the page. */}
          <span className="flex min-w-0 items-center gap-1.25">
            <Mail className="size-3.5 shrink-0 text-ink-muted" strokeWidth={2} aria-hidden="true" />
            <span className="min-w-0 wrap-anywhere">{owner.email}</span>
          </span>
          {owner.phone && (
            <span className="flex items-center gap-1.25 tabular-nums">
              <Smartphone className="size-3.5 shrink-0 text-ink-muted" strokeWidth={2} aria-hidden="true" />
              {owner.phone}
            </span>
          )}
          <span>{member}</span>
          <span>{lastActive}</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
    </section>
  );
};

export default OwnerProfileHeader;
