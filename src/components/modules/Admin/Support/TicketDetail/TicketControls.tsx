"use client";

import { UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import SelectControl from "@/components/shared/form/SelectControl";
import Button from "@/components/smartly/Button";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { asStatus } from "@/lib/i18n/message";
import { TICKET_STATUS_LABEL } from "@/lib/tickets";
import { TICKET_STATUSES, type IAdminOption, type TicketStatus } from "@/types/ticket.types";
import { TICKET_CATEGORY_OPTIONS, TICKET_PRIORITY_OPTIONS } from "../ticketOptions";
import { CLOSING_STATUSES } from "./ticketStatusCopy";
import type { TicketControlsState } from "./useTicketControls";

// Radix Select reserves "" for "no value", so unassigned needs a token.
const UNASSIGNED = "unassigned";

const STATUS_OPTIONS = TICKET_STATUSES.map((status) => ({ value: status, label: asStatus(TICKET_STATUS_LABEL[status]) }));
// 38px, and 44px under a finger.
const SELECT = "h-9.5 w-full rounded-md border-line-strong bg-surface text-body font-medium text-ink pointer-coarse:h-11";

interface TicketControlsProps {
  controls: TicketControlsState;
  admins: IAdminOption[];
  // The reader, for "Assign to me".
  currentAdminId: string | null;
}

// The design's settings card beside the thread: status, priority, type and
// who has it.
const TicketControls = ({ controls, admins, currentAdminId }: TicketControlsProps) => {
  const { ticket, isPending, setStatus, setPriority, setCategory, setAssignee } = controls;
  const [closingStatus, setClosingStatus] = useState<TicketStatus | null>(null);
  const { translate } = useLocale();
  const closingCopy = closingStatus ? CLOSING_STATUSES[closingStatus] : undefined;
  // Taking a ticket is one tap, not a hunt through the roster.
  const me = admins.find((admin) => admin.id === currentAdminId);

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
      <SelectControl label="Type" value={ticket.category} options={TICKET_CATEGORY_OPTIONS} onValueChange={setCategory} disabled={isPending} className={SELECT} />
      <div className="flex flex-col gap-1">
        <SelectControl
          label="Assigned to"
          value={ticket.assignedToAdminId ?? UNASSIGNED}
          options={assigneeOptions}
          onValueChange={(adminId) => setAssignee(admins.find((admin) => admin.id === adminId) ?? null)}
          disabled={isPending}
          className={SELECT}
        />
        {me && ticket.assignedToAdminId !== me.id && (
          <Button variant="ghost" size="sm" className="self-start px-2 text-emerald pointer-coarse:h-11" disabled={isPending} onClick={() => setAssignee(me)}>
            <UserCheck aria-hidden="true" />
            {translate("Assign to me")}
          </Button>
        )}
      </div>

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
