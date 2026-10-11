"use client";

import type { IAdminOption, ISupportTicketDetail } from "@/types/ticket.types";
import TicketControls from "./TicketControls";
import TicketConversation from "./TicketConversation";
import TicketDetailsCard from "./TicketDetailsCard";
import TicketHeader from "./TicketHeader";
import TicketRequesterCard from "./TicketRequesterCard";
import { useTicketControls } from "./useTicketControls";

interface TicketDetailLayoutProps {
  ticket: ISupportTicketDetail;
  admins: IAdminOption[];
  currentAdminId: string | null;
  canManage: boolean;
}

const TicketDetailLayout = ({ ticket, admins, currentAdminId, canManage }: TicketDetailLayoutProps) => {
  // Every card renders the optimistic view, so a status or assignee change
  // shows everywhere on the page at once.
  const controls = useTicketControls(ticket);
  const view = controls.ticket;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <TicketHeader ticket={view} controls={canManage && <TicketControls controls={controls} admins={admins} />} />
        <TicketConversation ticket={view} admins={admins} currentAdminId={currentAdminId} canReply={canManage} />
      </div>
      <div className="space-y-6">
        <TicketRequesterCard user={view.platformUser} />
        <TicketDetailsCard ticket={view} />
      </div>
    </div>
  );
};

export default TicketDetailLayout;
