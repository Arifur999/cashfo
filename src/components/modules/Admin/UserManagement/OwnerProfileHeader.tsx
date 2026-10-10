import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/date";
import { getInitials } from "@/lib/text";
import type { IOwnerDetail } from "@/types/owner.types";

interface OwnerProfileHeaderProps {
  owner: IOwnerDetail;
  actions: React.ReactNode;
}

const OwnerProfileHeader = ({ owner, actions }: OwnerProfileHeaderProps) => {
  return (
    <Card className="shadow-sm shadow-black/5">
      <CardContent className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Avatar className="size-12">
            <AvatarFallback>{getInitials(owner.name)}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold text-foreground">{owner.name}</h1>
              <StatusBadgeCell status={owner.status} />
            </div>
            <p className="text-sm text-muted-foreground">{owner.email}</p>
            {owner.phone && <p className="text-sm text-muted-foreground">{owner.phone}</p>}
            <p className="text-xs text-muted-foreground">
              Member since {formatDate(owner.createdAt)}
              {owner.businessName && <> &middot; {owner.businessName}</>}
            </p>
          </div>
        </div>
        {actions}
      </CardContent>
    </Card>
  );
};

export default OwnerProfileHeader;
