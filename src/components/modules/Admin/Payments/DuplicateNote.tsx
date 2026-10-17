import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/date";
import { shortPaymentId } from "@/lib/payments";
import type { IPaymentDetail } from "@/types/payment.types";

const minutesApart = (a: string, b: string) => Math.max(1, Math.round(Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60_000));

// The amber note over a payment that repeats an earlier one: who, which
// plan, how close together, and a way to the earlier payment.
const DuplicateNote = ({ payment }: { payment: IPaymentDetail }) => {
  const earlier = payment.otherPayments.find((other) => other.id === payment.duplicateOfId);
  const gap = earlier ? minutesApart(payment.createdAt, earlier.createdAt) : null;

  return (
    <div role="note" className="flex flex-col gap-3 rounded-lg border border-warning/25 bg-warning-soft p-4 text-body leading-relaxed text-warning sm:flex-row sm:items-center">
      <div className="flex grow flex-col gap-1">
        <b className="font-semibold">
          Same person, same plan{gap !== null && `, ${gap} ${gap === 1 ? "minute" : "minutes"} apart`}
        </b>
        <span>
          {payment.duplicateOfId && shortPaymentId(payment.duplicateOfId)} already paid for {payment.plan.name}
          {earlier && ` on ${formatDate(earlier.createdAt, "d MMM")}`}. Check with the person before refunding this one.
        </span>
      </div>
      {payment.duplicateOfId && (
        <Button asChild variant="outline" size="sm" className="h-8.5 shrink-0 rounded-md border-line-strong bg-surface text-small font-semibold text-ink hover:bg-cream">
          <Link href={`/admin/payments/${payment.duplicateOfId}`}>Open {shortPaymentId(payment.duplicateOfId)}</Link>
        </Button>
      )}
    </div>
  );
};

export default DuplicateNote;
