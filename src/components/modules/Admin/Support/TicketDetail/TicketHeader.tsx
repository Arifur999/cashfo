import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/date";
import { humanizeEnum } from "@/lib/statusBadge";
import type { ISupportTicketDetail } from "@/types/ticket.types";

interface TicketHeaderProps {
  ticket: ISupportTicketDetail;
  // Status / priority / assignee controls, for roles that can manage tickets.
  controls?: React.ReactNode;
}

const TicketHeader = ({ ticket, controls }: TicketHeaderProps) => {
  return (
    <Card className="shadow-sm shadow-black/5">
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadgeCell status={ticket.status} />
            <StatusBadgeCell status={ticket.priority} label={`${humanizeEnum(ticket.priority)} priority`} />
            <Badge variant="outline">{humanizeEnum(ticket.category)}</Badge>
          </div>
          <h1 className="text-xl font-semibold break-words text-foreground">{ticket.subject}</h1>
          <p className="text-xs text-muted-foreground">
            Opened {formatDateTime(ticket.createdAt)} by {ticket.platformUser?.name ?? "an unknown user"} &middot; Updated{" "}
            {formatDateTime(ticket.updatedAt)}
          </p>
        </div>
        {controls && <div className="border-t pt-4">{controls}</div>}
      </CardContent>
    </Card>
  );
};

export default TicketHeader;
