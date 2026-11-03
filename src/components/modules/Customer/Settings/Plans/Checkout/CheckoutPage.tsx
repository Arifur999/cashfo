"use client";

import { useRouter } from "next/navigation";
import ErrorState from "@/components/smartly/ErrorState";
import { heroFamily, paidPlans, planFamilies, type BillingOverview, type BillingPlans, type CustomerPayment } from "@/lib/customer/billingDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { CheckoutChrome, type CheckoutView } from "./CheckoutChrome";
import { DoneView } from "./DoneView";
import { PayView } from "./PayView";
import { PendingView } from "./PendingView";

interface CheckoutPageProps {
  plans: BillingPlans | null;
  overview: BillingOverview | null;
  // The payment named in the address (?payment=), when there is one.
  payment: CustomerPayment | null;
  // ?payment= named one that couldn't be read (not theirs, or gone).
  paymentMissing: boolean;
  // ?plan=, the plan chosen on the Plans page.
  wantedPlanId: string | null;
}

// Settings › Plans › Checkout (Checkout board): paying for a plan, then the
// payment's status -- being checked, or all set with its receipt. The
// address says which (?plan= or ?payment=), so the bell, the emails and the
// sidebar's "See status" can open the right one.
export function CheckoutPage({ plans, overview, payment, paymentMissing, wantedPlanId }: CheckoutPageProps) {
  const { t } = useLocale();
  const router = useRouter();

  const options = plans ? paidPlans(plans.plans) : [];
  if (!plans || !overview || options.length === 0) {
    return (
      <CheckoutChrome view="pay">
        <ErrorState title={t(plans && overview ? "There are no plans to buy yet" : "Couldn't load the plans")} onRetry={() => router.refresh()} />
      </CheckoutChrome>
    );
  }

  let view: CheckoutView = "pay";
  let notice: string | null = null;
  if (payment?.status === "SUCCESS") view = "done";
  else if (payment?.status === "PENDING" && payment.submittedAt) view = "pending";
  else if (payment?.status === "FAILED") notice = t("This payment didn't go through. You can pay again below.");
  else if (payment?.status === "REFUNDED") notice = t("This payment was refunded. You can pay again below.");
  else if (paymentMissing) notice = t("We couldn't find that payment. You can start a new one below.");

  const isOption = (id: string | null | undefined) => (id && options.some((option) => option.id === id) ? id : null);
  const hero = heroFamily(planFamilies(plans.plans));
  const planId =
    isOption(payment?.planId) ?? isOption(wantedPlanId) ?? isOption(overview.subscription.isPaid ? overview.subscription.planId : null) ?? isOption(hero?.yearly?.id ?? hero?.monthly?.id) ?? options[0].id;

  return (
    <CheckoutChrome view={view}>
      {view === "done" && payment ? (
        <DoneView payment={payment} plans={plans} />
      ) : view === "pending" && payment ? (
        <PendingView payment={payment} plans={plans} />
      ) : (
        // A new plan chosen starts the form afresh.
        <PayView key={planId} plans={plans} overview={overview} planId={planId} notice={notice} />
      )}
    </CheckoutChrome>
  );
}
