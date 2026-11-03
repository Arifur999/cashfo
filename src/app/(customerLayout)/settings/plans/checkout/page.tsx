import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutPage } from "@/components/modules/Customer/Settings/Plans/Checkout/CheckoutPage";
import { checkoutHref } from "@/components/modules/Customer/Settings/Plans/checkoutRoute";
import { getBillingOverviewAction, getBillingPaymentAction, getBillingPlansAction } from "@/lib/customer/billingActions";
import { getTranslator } from "@/lib/i18n/locale";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t("Checkout") };
}

const one = (value: string | string[] | undefined): string | null => (typeof value === "string" && /^[A-Za-z0-9-]{1,64}$/.test(value) ? value : null);

// Settings › Plans › Checkout (Checkout board). ?plan= opens the form for a
// plan; ?payment= shows that payment: still to pay, being checked, or done.
// With neither, an open payment opens itself -- one whose money was sent
// always does, since no other can start until it is settled.
export default async function SettingsCheckoutPage({ searchParams }: PageProps<"/settings/plans/checkout">) {
  const params = await searchParams;
  const paymentId = one(params.payment);
  const wantedPlanId = one(params.plan);
  const [plans, overview, payment] = await Promise.all([getBillingPlansAction(), getBillingOverviewAction(), paymentId ? getBillingPaymentAction(paymentId) : null]);

  const open = overview.success ? overview.data?.pendingPayment : null;
  if (!paymentId && open && (open.submittedAt || !wantedPlanId)) redirect(checkoutHref({ payment: open.id }));

  return (
    <CheckoutPage
      plans={plans.success ? (plans.data ?? null) : null}
      overview={overview.success ? (overview.data ?? null) : null}
      payment={payment?.success ? (payment.data ?? null) : null}
      paymentMissing={paymentId !== null && !payment?.success}
      wantedPlanId={wantedPlanId}
    />
  );
}
