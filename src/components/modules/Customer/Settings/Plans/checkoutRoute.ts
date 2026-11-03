import { PLANS_ROUTE } from "@/lib/customer/nav";

// The payment page (Checkout board): a plan to pay for, or a payment
// already started (its status, or the details still to send).
export const CHECKOUT_ROUTE = `${PLANS_ROUTE}/checkout`;

export function checkoutHref(target: { plan: string } | { payment: string }): string {
  const query: Record<string, string> = "plan" in target ? { plan: target.plan } : { payment: target.payment };
  return `${CHECKOUT_ROUTE}?${new URLSearchParams(query).toString()}`;
}
