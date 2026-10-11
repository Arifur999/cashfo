import DescriptionList from "@/components/shared/DescriptionList";
import SectionCard from "@/components/shared/SectionCard";
import { formatDateTime } from "@/lib/date";
import { humanizeEnum } from "@/lib/statusBadge";
import type { ISupportTicketDetail } from "@/types/ticket.types";

const TicketDetailsCard = ({ ticket }: { ticket: ISupportTicketDetail }) => {
  return (
    <SectionCard title="Details">
      <DescriptionList
        items={[
          {
            label: "Ticket",
            value: (
              <span className="font-mono text-xs" title={ticket.id}>
                #{ticket.id.slice(0, 8)}
              </span>
            ),
          },
          { label: "Category", value: humanizeEnum(ticket.category) },
          { label: "Assigned to", value: ticket.assignedAdmin?.name ?? "Unassigned" },
          { label: "Created", value: formatDateTime(ticket.createdAt) },
          { label: "Last updated", value: formatDateTime(ticket.updatedAt) },
          { label: "Resolved", value: formatDateTime(ticket.resolvedAt) },
        ]}
      />
    </SectionCard>
  );
};

export default TicketDetailsCard;
