import { Search } from "lucide-react";
import Link from "next/link";
import UserInfoCell from "@/components/shared/cell/UserInfoCell";
import DescriptionList from "@/components/shared/DescriptionList";
import SectionCard from "@/components/shared/SectionCard";
import { Button } from "@/components/ui/button";
import type { ISupportTicketDetail } from "@/types/ticket.types";

const TicketRequesterCard = ({ user }: { user: ISupportTicketDetail["platformUser"] }) => {
  return (
    <SectionCard title="Requester">
      {user ? (
        <div className="space-y-4">
          <UserInfoCell name={user.name} email={user.email} />
          <DescriptionList items={[{ label: "Plan", value: user.plan?.name ?? "No plan" }]} />
          {/* Searching by email finds the customer for new tickets (account
              ids) and for older ones from the PlatformUser sandbox alike;
              the email is what both share. */}
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={`/admin/users?search=${encodeURIComponent(user.email)}`}>
              <Search aria-hidden="true" /> Find in User Management
            </Link>
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">This user no longer exists.</p>
      )}
    </SectionCard>
  );
};

export default TicketRequesterCard;
