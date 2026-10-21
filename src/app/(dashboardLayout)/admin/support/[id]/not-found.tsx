import { SearchX } from "lucide-react";
import Link from "next/link";
import { TICKETS_ROUTE } from "@/components/modules/Admin/Support/ticketLinks";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import IconTile from "@/components/smartly/IconTile";

// An unknown or deleted ticket (a stale link, a typo): say so, and lead back
// to the queue rather than to the dashboard as the panel's own not-found
// page does.
export default function TicketNotFound() {
  return (
    <Card className="flex flex-col items-center gap-3 py-14 text-center">
      <IconTile tone="neutral" size={48}>
        <SearchX />
      </IconTile>
      <h1 className="text-h3 text-ink">
        <T>This ticket doesn&apos;t exist</T>
      </h1>
      <p className="max-w-md text-body text-ink-muted">
        <T>It may have been deleted, or the link is wrong.</T>
      </p>
      <Button asChild variant="secondary" className="mt-1">
        <Link href={TICKETS_ROUTE}>
          <T>All tickets</T>
        </Link>
      </Button>
    </Card>
  );
}
