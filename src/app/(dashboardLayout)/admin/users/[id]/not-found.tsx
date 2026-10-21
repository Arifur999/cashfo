import { UserX } from "lucide-react";
import Link from "next/link";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import IconTile from "@/components/smartly/IconTile";
import T from "@/components/shared/T";
import { ADMIN_USERS_ROUTE } from "@/lib/navItem";

// A user link that leads nowhere (an old link from a ticket or the audit
// log, a typo, an account that was removed): say so, and lead back to the
// people rather than to the dashboard. Laid out like the other record pages'
// not-found, with the sentence as the page's heading.
export default function UserNotFound() {
  return (
    <Card className="flex flex-col items-center gap-3 py-14 text-center">
      <IconTile tone="neutral" size={48}>
        <UserX />
      </IconTile>
      <h1 className="text-h3 text-ink"><T>This person doesn&apos;t exist or their account was removed</T></h1>
      <Button asChild variant="secondary" className="mt-1">
        <Link href={ADMIN_USERS_ROUTE}><T>All users</T></Link>
      </Button>
    </Card>
  );
}
