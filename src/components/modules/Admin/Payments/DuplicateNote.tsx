import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/date";
import { shortPaymentId } from "@/lib/payments";
import type { IPaymentDetail } from "@/types/payment.types";
import { getTranslator } from "@/lib/i18n/locale";
import { plural } from "@/lib/i18n/message";

const minutesApart = (a: string, b: string) => Math.max(1, Math.round(Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60_000));

// The amber note over a payment that repeats an earlier one: who, which
// plan, how close together, and a way to the earlier payment.
const DuplicateNote = async ({ payment }: { payment: IPaymentDetail }) => {
  const { t } = await getTranslator("admin");
  const earlier = payment.otherPayments.find((other) => other.id === payment.duplicateOfId);
  const gap = earlier ? minutesApart(payment.createdAt, earlier.createdAt) : null;

  return (
    <div role="note" className="flex flex-col gap-3 rounded-lg border border-warning/25 bg-warning-soft p-4 text-body leading-relaxed text-warning sm:flex-row sm:items-center">
      <div className="flex grow flex-col gap-1">
        <b className="font-semibold">
          {gap === null ? t("Same person, same plan") : plural(t, gap, "Same person, same plan, {count} minute apart", "Same person, same plan, {count} minutes apart")}
        </b>
        <span>
          {t(earlier ? "{id} already paid for {plan} on {date}. Check with the person before refunding this one." : "{id} already paid for {plan}. Check with the person before refunding this one.", {
            id: payment.duplicateOfId ? shortPaymentId(payment.duplicateOfId) : "",
            plan: payment.plan.name,
            date: earlier ? formatDate(earlier.createdAt, "d MMM") : "",
          })}
        </span>
      </div>
      {payment.duplicateOfId && (
        <Button asChild variant="outline" size="sm" className="h-8.5 shrink-0 rounded-md border-line-strong bg-surface text-small font-semibold text-ink hover:bg-cream">
          <Link href={`/admin/payments/${payment.duplicateOfId}`}>{t("Open {name}", { name: shortPaymentId(payment.duplicateOfId) })}</Link>
        </Button>
      )}
    </div>
  );
};

export default DuplicateNote;
