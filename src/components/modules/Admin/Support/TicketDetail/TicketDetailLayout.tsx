"use client";

import BackLink from "@/components/shared/BackLink";
import type { IAdminOption, ISupportTicketDetail } from "@/types/ticket.types";
import TicketControls from "./TicketControls";
import TicketConversation from "./TicketConversation";
import TicketHeader from "./TicketHeader";
import TicketRequesterCard from "./TicketRequesterCard";
import { useTicketControls } from "./useTicketControls";
import T from "@/components/shared/T";

interface TicketDetailLayoutProps {
  ticket: ISupportTicketDetail;
  admins: IAdminOption[];
  currentAdminId: string | null;
  canManage: boolean;
}

// The design's ticket page: the conversation card on the left, the
// settings and the person on the right.
const TicketDetailLayout = ({ ticket, admins, currentAdminId, canManage }: TicketDetailLayoutProps) => {
  // Every card renders the optimistic view, so a status or assignee change
  // shows everywhere on the page at once.
  const controls = useTicketControls(ticket);
  const view = controls.ticket;

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/admin/support"><T>All tickets</T></BackLink>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="ticket-subject" className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-card">
          <TicketHeader ticket={view} />
          <TicketConversation ticket={view} admins={admins} currentAdminId={currentAdminId} canReply={canManage} onSetStatus={canManage ? controls.setStatus : undefined} />
        </section>
        <aside className="flex flex-col gap-4">
          {canManage && <TicketControls controls={controls} admins={admins} />}
          <TicketRequesterCard ticket={view} />
        </aside>
      </div>
    </div>
  );
};

export default TicketDetailLayout;
