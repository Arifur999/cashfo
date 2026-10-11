"use client";

import { useOptimistic, useTransition } from "react";
import { assignTicketAction, updateTicketAction } from "@/app/(dashboardLayout)/admin/support/_action";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import type { IAdminOption, ISupportTicketDetail, IUpdateTicketPayload, TicketPriority, TicketStatus } from "@/types/ticket.types";

type TicketPatch = Partial<Pick<ISupportTicketDetail, "status" | "priority" | "assignedToAdminId" | "assignedAdmin">>;

const applyPatch = (ticket: ISupportTicketDetail, patch: TicketPatch): ISupportTicketDetail => ({ ...ticket, ...patch });

// Status, priority and assignee changes apply optimistically: the whole page
// shows the new value at once, and React drops the optimistic copy when the
// request settles -- by then the refetched ticket carries the change, or (on
// failure) the server's value returns alongside the error toast.
export function useTicketControls(ticket: ISupportTicketDetail) {
  const [view, addPatch] = useOptimistic(ticket, applyPatch);
  const [isPending, startTransition] = useTransition();

  // The page reads everything through the ticket queries, so invalidating
  // them is enough -- no server re-render needed.
  const update = useActionMutation({
    action: (payload: IUpdateTicketPayload) => updateTicketAction(ticket.id, payload),
    successMessage: "Ticket updated",
    invalidateKeys: [queryKeys.tickets.all],
    refreshRoute: false,
  });
  const assign = useActionMutation({
    action: (adminId: string | null) => assignTicketAction(ticket.id, { adminId }),
    successMessage: "Assignee updated",
    invalidateKeys: [queryKeys.tickets.all],
    refreshRoute: false,
  });

  const commit = (patch: TicketPatch, request: () => Promise<boolean>) => {
    startTransition(async () => {
      addPatch(patch);
      await request();
    });
  };

  return {
    ticket: view,
    isPending,
    setStatus: (status: TicketStatus) => commit({ status }, () => update.run({ status })),
    setPriority: (priority: TicketPriority) => commit({ priority }, () => update.run({ priority })),
    setAssignee: (admin: IAdminOption | null) =>
      commit({ assignedToAdminId: admin?.id ?? null, assignedAdmin: admin && { id: admin.id, name: admin.name } }, () =>
        assign.run(admin?.id ?? null),
      ),
  };
}

export type TicketControlsState = ReturnType<typeof useTicketControls>;
