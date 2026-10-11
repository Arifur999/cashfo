"use client";

import { useMemo, useState } from "react";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import SelectControl from "@/components/shared/form/SelectControl";
import type { IAdminOption, TicketStatus } from "@/types/ticket.types";
import { TICKET_PRIORITY_OPTIONS, TICKET_STATUS_OPTIONS } from "../ticketOptions";
import type { TicketControlsState } from "./useTicketControls";

// Radix Select reserves "" for "no value", so unassigned needs a token.
const UNASSIGNED = "unassigned";

// Taking a ticket out of the queue is the one change worth a second look.
const CLOSING_STATUSES: Partial<Record<TicketStatus, { title: string; description: string; confirmLabel: string }>> = {
  RESOLVED: {
    title: "Mark as resolved?",
    description: "The ticket leaves the open queue and its resolution time is recorded.",
    confirmLabel: "Mark resolved",
  },
  CLOSED: {
    title: "Close this ticket?",
    description: "The ticket leaves the queue. It can be reopened later by changing its status.",
    confirmLabel: "Close ticket",
  },
};

interface TicketControlsProps {
  controls: TicketControlsState;
  admins: IAdminOption[];
}

const TicketControls = ({ controls, admins }: TicketControlsProps) => {
  const { ticket, isPending, setStatus, setPriority, setAssignee } = controls;
  const [closingStatus, setClosingStatus] = useState<TicketStatus | null>(null);
  const closingCopy = closingStatus ? CLOSING_STATUSES[closingStatus] : undefined;

  const assigneeOptions = useMemo(() => {
    const options = [{ value: UNASSIGNED, label: "Unassigned" }, ...admins.map((admin) => ({ value: admin.id, label: admin.name }))];
    // An assignee who has since been deactivated isn't in the roster, but
    // the select must still be able to show them.
    const current = ticket.assignedAdmin;
    if (current && !admins.some((admin) => admin.id === current.id)) {
      options.push({ value: current.id, label: `${current.name} (inactive)` });
    }
    return options;
  }, [admins, ticket.assignedAdmin]);

  const changeStatus = (status: TicketStatus) => {
    if (CLOSING_STATUSES[status]) {
      setClosingStatus(status);
    } else {
      setStatus(status);
    }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <SelectControl label="Status" value={ticket.status} options={TICKET_STATUS_OPTIONS} onValueChange={changeStatus} disabled={isPending} />
      <SelectControl label="Priority" value={ticket.priority} options={TICKET_PRIORITY_OPTIONS} onValueChange={setPriority} disabled={isPending} />
      <SelectControl
        label="Assignee"
        value={ticket.assignedToAdminId ?? UNASSIGNED}
        options={assigneeOptions}
        onValueChange={(adminId) => setAssignee(admins.find((admin) => admin.id === adminId) ?? null)}
        disabled={isPending}
      />

      <ConfirmDialog
        open={closingStatus !== null}
        onOpenChange={(open) => !open && setClosingStatus(null)}
        title={closingCopy?.title ?? ""}
        description={closingCopy?.description ?? ""}
        confirmLabel={closingCopy?.confirmLabel}
        onConfirm={() => {
          // The change shows at once (optimistic), so the dialog needn't wait.
          if (closingStatus) setStatus(closingStatus);
          setClosingStatus(null);
        }}
      />
    </div>
  );
};

export default TicketControls;
