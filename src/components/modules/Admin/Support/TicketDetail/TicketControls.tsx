"use client";

import { useMemo, useState } from "react";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import SelectControl from "@/components/shared/form/SelectControl";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { asStatus } from "@/lib/i18n/message";
import { TICKET_STATUS_LABEL } from "@/lib/tickets";
import { TICKET_STATUSES, type IAdminOption, type TicketStatus } from "@/types/ticket.types";
import { TICKET_PRIORITY_OPTIONS } from "../ticketOptions";
import type { TicketControlsState } from "./useTicketControls";

// Radix Select reserves "" for "no value", so unassigned needs a token.
const UNASSIGNED = "unassigned";

const STATUS_OPTIONS = TICKET_STATUSES.map((status) => ({ value: status, label: asStatus(TICKET_STATUS_LABEL[status]) }));
const SELECT = "h-9.5 w-full rounded-md border-line-strong bg-surface text-body font-medium text-ink";

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

// The design's settings card beside the thread: status, priority, who has it.
const TicketControls = ({ controls, admins }: TicketControlsProps) => {
  const { ticket, isPending, setStatus, setPriority, setAssignee } = controls;
  const [closingStatus, setClosingStatus] = useState<TicketStatus | null>(null);
  const { translate } = useLocale();
  const closingCopy = closingStatus ? CLOSING_STATUSES[closingStatus] : undefined;

  const assigneeOptions = useMemo(() => {
    const options = [{ value: UNASSIGNED, label: "Not assigned" }, ...admins.map((admin) => ({ value: admin.id, label: admin.name }))];
    // An assignee who has since been deactivated isn't in the roster, but
    // the select must still be able to show them.
    const current = ticket.assignedAdmin;
    if (current && !admins.some((admin) => admin.id === current.id)) {
      options.push({ value: current.id, label: translate("{name} (inactive)", { name: current.name }) });
    }
    return options;
  }, [admins, ticket.assignedAdmin, translate]);

  const changeStatus = (status: TicketStatus) => {
    if (CLOSING_STATUSES[status]) {
      setClosingStatus(status);
    } else {
      setStatus(status);
    }
  };

  return (
    <section aria-label={translate("Ticket settings")} className="flex flex-col gap-3 rounded-lg border border-line bg-surface px-5 py-4 shadow-card">
      <SelectControl label="Status" value={ticket.status} options={STATUS_OPTIONS} onValueChange={changeStatus} disabled={isPending} className={SELECT} />
      <SelectControl label="Priority" value={ticket.priority} options={TICKET_PRIORITY_OPTIONS} onValueChange={setPriority} disabled={isPending} className={SELECT} />
      <SelectControl
        label="Assigned to"
        value={ticket.assignedToAdminId ?? UNASSIGNED}
        options={assigneeOptions}
        onValueChange={(adminId) => setAssignee(admins.find((admin) => admin.id === adminId) ?? null)}
        disabled={isPending}
        className={SELECT}
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
    </section>
  );
};

export default TicketControls;
