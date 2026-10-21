import Link from "next/link";
import Card from "@/components/smartly/Card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { avatarTone } from "@/lib/avatarTone";
import { getInitials } from "@/lib/text";
import { cn } from "@/lib/utils";
import type { IPaymentDetail } from "@/types/payment.types";
import T from "@/components/shared/T";

// Who paid, in the tint they have in every list, and a search for them in
// Users: payments keep their own record of the person, so the search by
// email is the honest way there (it may find nobody).
const PaidByCard = ({ payment }: { payment: IPaymentDetail }) => {
  const person = payment.platformUser;
  return (
    <Card asChild padding="none" className="flex flex-col gap-3 px-5 py-4">
      <section aria-labelledby="paid-by">
        <h2 id="paid-by" className="text-title text-ink">
          <T>Paid by</T>
        </h2>
        {person ? (
          <>
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarFallback className={cn("text-small font-bold", avatarTone(person.email))}>{getInitials(person.name) || "?"}</AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-col gap-px">
                <span className="truncate text-body font-semibold text-ink">{person.name}</span>
                <span className="truncate text-small text-ink-muted">{person.email}</span>
              </span>
            </div>
            <span className="text-small text-ink-2">{payment.plan.name}</span>
            <Link href={`/admin/users?search=${encodeURIComponent(person.email)}`} className="text-small font-semibold text-emerald hover:underline">
              <T>Find them in Users</T>
            </Link>
          </>
        ) : (
          <p className="text-small text-ink-muted"><T>This person&apos;s record is gone.</T></p>
        )}
      </section>
    </Card>
  );
};

export default PaidByCard;
