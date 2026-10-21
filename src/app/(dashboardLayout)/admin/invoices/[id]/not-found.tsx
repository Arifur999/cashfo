import { SearchX } from "lucide-react";
import Link from "next/link";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import IconTile from "@/components/smartly/IconTile";
import T from "@/components/shared/T";

// A stale or mistyped invoice link: say so, and lead back to the invoices
// rather than to the dashboard.
export default function InvoiceNotFound() {
  return (
    <Card className="flex flex-col items-center gap-3 py-14 text-center">
      <IconTile tone="neutral" size={48}>
        <SearchX />
      </IconTile>
      <h1 className="text-h3 text-ink"><T>Invoice not found</T></h1>
      <p className="max-w-md text-body text-ink-muted"><T>This invoice doesn&apos;t exist, or was removed.</T></p>
      <Button asChild variant="secondary" className="mt-1">
        <Link href="/admin/invoices"><T>All invoices</T></Link>
      </Button>
    </Card>
  );
}
