import Link from "next/link";
import Card from "@/components/smartly/Card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { avatarTone } from "@/lib/avatarTone";
import { getInitials } from "@/lib/text";
import { cn } from "@/lib/utils";
import type { IPayerSubscription, IPaymentDetail } from "@/types/payment.types";
import T from "@/components/shared/T";
import { formatDate } from "@/lib/date";
import { getTranslator } from "@/lib/i18n/locale";
import type { Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";

// "Monthly Pro · next renewal 1 Nov 2026": the plan they are on now, and
// what happens next.
const planLine = (subscription: IPayerSubscription, t: Translate, locale: Locale) => {
  const day = (value: string | null) => formatDate(value, "d MMM yyyy", "—", locale);
  if (subscription.status === "TRIALING" && subscription.trialEndsAt) return t("{plan} · trial ends {date}", { plan: subscription.planName, date: day(subscription.trialEndsAt) });
  if (subscription.status === "PAST_DUE") return t("{plan} · renewal overdue", { plan: subscription.planName });
  if (!subscription.currentPeriodEnd || subscription.status === "CANCELLED" || subscription.status === "EXPIRED") return subscription.planName;
  return subscription.cancelAtPeriodEnd
    ? t("{plan} · ends {date}", { plan: subscription.planName, date: day(subscription.currentPeriodEnd) })
    : t("{plan} · next renewal {date}", { plan: subscription.planName, date: day(subscription.currentPeriodEnd) });
};

// Who paid, in the tint they have in every list, the plan they are on now,
// and their page (a customer's payment), or a search for them in Users (an
// old sandbox payment, which keeps its own record of the person).
const PaidByCard = async ({ payment }: { payment: IPaymentDetail }) => {
  const person = payment.platformUser;
  const { t, locale } = await getTranslator("admin");
  return (
    <Card asChild padding="none" className="flex flex-col gap-2.5 px-4.5 py-4">
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
            <span className="text-small text-ink-2">{payment.subscription ? planLine(payment.subscription, t, locale) : payment.plan.name}</span>
            {payment.userId ? (
              <Link href={`/admin/users/${payment.userId}`} className="text-small font-semibold text-emerald hover:underline">
                <T>Open their page</T>
              </Link>
            ) : (
              <Link href={`/admin/users?search=${encodeURIComponent(person.email)}`} className="text-small font-semibold text-emerald hover:underline">
                <T>Find them in Users</T>
              </Link>
            )}
          </>
        ) : (
          <p className="text-small text-ink-muted"><T>This person&apos;s record is gone.</T></p>
        )}
      </section>
    </Card>
  );
};

export default PaidByCard;
