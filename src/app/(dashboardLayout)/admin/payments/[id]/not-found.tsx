import { SearchX } from "lucide-react";
import Link from "next/link";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import IconTile from "@/components/smartly/IconTile";
import T from "@/components/shared/T";

// A stale or mistyped payment link: say so, and lead back to the list the
// admin came from rather than to the dashboard.
export default function PaymentNotFound() {
  return (
    <Card className="flex flex-col items-center gap-3 py-14 text-center">
      <IconTile tone="neutral" size={48}>
        <SearchX />
      </IconTile>
      <h1 className="text-h3 text-ink"><T>Payment not found</T></h1>
      <p className="max-w-md text-body text-ink-muted"><T>This payment doesn&apos;t exist, or was removed.</T></p>
      <Button asChild variant="secondary" className="mt-1">
        <Link href="/admin/payments"><T>All payments</T></Link>
      </Button>
    </Card>
  );
}
