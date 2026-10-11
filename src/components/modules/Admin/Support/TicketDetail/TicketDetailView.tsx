"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import RouteLoading from "@/components/shared/RouteLoading";
import { assignableAdminsQuery, ticketDetailQuery } from "@/queries/ticket.queries";
import TicketDetailLayout from "./TicketDetailLayout";

interface TicketDetailViewProps {
  ticketId: string;
  currentAdminId: string | null;
  canManage: boolean;
}

const TicketDetailView = ({ ticketId, currentAdminId, canManage }: TicketDetailViewProps) => {
  const ticket = useQuery(ticketDetailQuery(ticketId)).data?.data;
  const { data: adminsResponse } = useQuery(assignableAdminsQuery());
  const admins = useMemo(() => adminsResponse?.data ?? [], [adminsResponse]);

  // The page fetched (or 404'd) the ticket before rendering this, so the
  // cache is warm; this only guards the type.
  if (!ticket) {
    return <RouteLoading label="Loading ticket..." />;
  }

  return <TicketDetailLayout ticket={ticket} admins={admins} currentAdminId={currentAdminId} canManage={canManage} />;
};

export default TicketDetailView;
