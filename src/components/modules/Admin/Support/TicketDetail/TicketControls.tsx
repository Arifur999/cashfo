"use client";

import { UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import Button from "@/components/smartly/Button";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { asStatus } from "@/lib/i18n/message";
import { humanizeEnum } from "@/lib/statusBadge";
import { TICKET_STATUS_LABEL } from "@/lib/tickets";
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, type IAdminOption, type TicketStatus } from "@/types/ticket.types";
import { TICKET_PRIORITY_DOT, TICKET_STATUS_DOT } from "../ticketOptions";
import { CLOSING_STATUSES } from "./ticketStatusCopy";
import TicketSelect, { type TicketSelectOption } from "./TicketSelect";
import type { TicketControlsState } from "./useTicketControls";

// Radix Select reserves "" for "no value", so unassigned needs a token.
const UNASSIGNED = "unassigned";

const STATUS_OPTIONS = TICKET_STATUSES.map((status) => ({ value: status, label: asStatus(TICKET_STATUS_LABEL[status]), dot: TICKET_STATUS_DOT[status] }));
const PRIORITY_OPTIONS = TICKET_PRIORITIES.map((priority) => ({ value: priority, label: humanizeEnum(priority), dot: TICKET_PRIORITY_DOT[priority] }));
const CATEGORY_OPTIONS = TICKET_CATEGORIES.map((category) => ({ value: category, label: humanizeEnum(category) }));

interface TicketControlsProps {
  controls: TicketControlsState;
  admins: IAdminOption[];
  // The reader, named "(you)" in the list, and for "Assign to me".
  currentAdminId: string | null;
}

// The board's settings card beside the thread: status and priority with
// their dots, the type, and who has it.
const TicketControls = ({ controls, admins, currentAdminId }: TicketControlsProps) => {
  const { ticket, isPending, setStatus, setPriority, setCategory, setAssignee } = controls;
  const [closingStatus, setClosingStatus] = useState<TicketStatus | null>(null);
  const { translate } = useLocale();
  const closingCopy = closingStatus ? CLOSING_STATUSES[closingStatus] : undefined;
  // Taking a ticket is one tap, not a hunt through the roster.
  const me = admins.find((admin) => admin.id === currentAdminId);

  const assigneeOptions = useMemo(() => {
    const options: TicketSelectOption<string>[] = [
      { value: UNASSIGNED, label: "Not assigned" },
      ...admins.map((admin) => ({ value: admin.id, label: admin.id === currentAdminId ? translate("{name} (you)", { name: admin.name }) : admin.name, raw: true })),
    ];
    // An assignee who has since been deactivated isn't in the roster, but
    // the select must still be able to show them.
    const current = ticket.assignedAdmin;
    if (current && !admins.some((admin) => admin.id === current.id)) {
      options.push({ value: current.id, label: translate("{name} (inactive)", { name: current.name }), raw: true });
    }
    return options;
  }, [admins, currentAdminId, ticket.assignedAdmin, translate]);

  const changeStatus = (status: TicketStatus) => {
    if (CLOSING_STATUSES[status]) {
      setClosingStatus(status);
    } else {
      setStatus(status);
    }
  };

  return (
    <section aria-label={translate("Ticket settings")} className="flex flex-col gap-3 rounded-card border border-line-card bg-surface px-4.5 py-4 shadow-card">
      <TicketSelect label="Status" value={ticket.status} options={STATUS_OPTIONS} onValueChange={changeStatus} disabled={isPending} />
      <TicketSelect label="Priority" value={ticket.priority} options={PRIORITY_OPTIONS} onValueChange={setPriority} disabled={isPending} />
      <TicketSelect label="Type" value={ticket.category} options={CATEGORY_OPTIONS} onValueChange={setCategory} disabled={isPending} />
      <div className="flex flex-col gap-1">
        <TicketSelect
          label="Assigned to"
          value={ticket.assignedToAdminId ?? UNASSIGNED}
          options={assigneeOptions}
          onValueChange={(adminId) => setAssignee(admins.find((admin) => admin.id === adminId) ?? null)}
          disabled={isPending}
        />
        {me && ticket.assignedToAdminId !== me.id && (
          <Button variant="ghost" size="xs" className="self-start px-2 text-emerald pointer-coarse:h-11" disabled={isPending} onClick={() => setAssignee(me)}>
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
