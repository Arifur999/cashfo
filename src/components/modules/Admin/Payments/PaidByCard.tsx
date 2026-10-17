import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/text";
import type { IPaymentDetail } from "@/types/payment.types";

// Who paid, and a way to their page (found by email, since payments keep
// their own record of the person).
const PaidByCard = ({ payment }: { payment: IPaymentDetail }) => {
  const person = payment.platformUser;
  return (
    <section aria-labelledby="paid-by" className="flex flex-col gap-3 rounded-lg border border-line bg-surface px-5 py-4 shadow-card">
      <h2 id="paid-by" className="text-title text-ink">
        Paid by
      </h2>
      {person ? (
        <>
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarFallback className="bg-info-soft text-small font-bold text-info">{getInitials(person.name) || "?"}</AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-col gap-px">
              <span className="truncate text-body font-semibold text-ink">{person.name}</span>
              <span className="truncate text-small text-ink-muted">{person.email}</span>
            </span>
          </div>
          <span className="text-small text-ink-2">{payment.plan.name}</span>
          <Link href={`/admin/users?search=${encodeURIComponent(person.email)}`} className="text-small font-semibold text-emerald hover:underline">
            Open their page
          </Link>
        </>
      ) : (
        <p className="text-small text-ink-muted">This person&apos;s record is gone.</p>
      )}
    </section>
  );
};

export default PaidByCard;
