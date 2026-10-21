import { Mail, Phone } from "lucide-react";
import PlanChipCell from "@/components/shared/cell/PlanChipCell";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/text";
import type { IOwnerDetail } from "@/types/owner.types";

interface OwnerProfileHeaderProps {
  owner: IOwnerDetail;
  actions: React.ReactNode;
}

// Who this is, in one card: initials, name with status and plan, how to
// reach them, and the actions on the right. When they joined and last
// signed in are the tiles' below, so the overview says each thing once.
const OwnerProfileHeader = ({ owner, actions }: OwnerProfileHeaderProps) => (
  <section aria-label={owner.name} className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 shadow-card lg:flex-row lg:items-center">
    <Avatar className="size-14.5">
      <AvatarFallback className="bg-mint-50 text-h3 font-bold text-emerald">{getInitials(owner.name)}</AvatarFallback>
    </Avatar>
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="min-w-0 text-h2 text-ink wrap-anywhere">{owner.name}</h1>
        <StatusBadgeCell status={owner.status} dot />
        {/* The plan's own colour, as on every list: Free grey, Business amber. */}
        {owner.planName && <PlanChipCell plan={owner.planName} />}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-ink-2">
        {/* A long address breaks anywhere on a phone instead of widening the page. */}
        <span className="flex min-w-0 items-center gap-1">
          <Mail className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
          <span className="min-w-0 wrap-anywhere">{owner.email}</span>
        </span>
        {owner.phone && (
          <span className="flex items-center gap-1 tabular-nums">
            <Phone className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
            {owner.phone}
          </span>
        )}
      </div>
    </div>
    <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
  </section>
);

export default OwnerProfileHeader;
