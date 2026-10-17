import { Mail, Phone } from "lucide-react";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate, formatRelativeDay } from "@/lib/date";
import { getInitials } from "@/lib/text";
import type { IOwnerDetail } from "@/types/owner.types";

interface OwnerProfileHeaderProps {
  owner: IOwnerDetail;
  actions: React.ReactNode;
}

const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

// Who this is, in one card: initials, name with status and plan, how to
// reach them, how long they have been here, and the actions on the right.
const OwnerProfileHeader = ({ owner, actions }: OwnerProfileHeaderProps) => {
  const days = daysSince(owner.createdAt);
  return (
    <section aria-label={owner.name} className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 shadow-card lg:flex-row lg:items-center">
      <Avatar className="size-14.5">
        <AvatarFallback className="bg-mint-50 text-h3 font-bold text-emerald">{getInitials(owner.name)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-h2 text-ink">{owner.name}</h1>
          <StatusBadgeCell status={owner.status} dot />
          {owner.planName && <span className="rounded-full bg-forest px-2 py-px text-caption font-semibold text-white dark:bg-emerald dark:text-on-action">{owner.planName}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-ink-2">
          <span className="flex items-center gap-1">
            <Mail className="size-3.5 text-ink-muted" aria-hidden="true" />
            {owner.email}
          </span>
          {owner.phone && (
            <span className="flex items-center gap-1 tabular-nums">
              <Phone className="size-3.5 text-ink-muted" aria-hidden="true" />
              {owner.phone}
            </span>
          )}
          <span>
            Member since {formatDate(owner.createdAt, "d MMM yyyy")} · {days} {days === 1 ? "day" : "days"}
          </span>
          <span>{owner.lastLoginAt ? `Last active ${formatRelativeDay(owner.lastLoginAt).replace(/^Today/, "today").replace(/^Yesterday/, "yesterday")}` : "Never signed in"}</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
    </section>
  );
};

export default OwnerProfileHeader;
