import { describe, expect, it } from "vitest";
import { bnAdminScopeDictionary } from "@/lib/i18n/dictionary";

// The English keys the money pages (Payments, a payment, Invoices, Revenue,
// Plans and Coupons) pass to t(), word for word, where a missing one would
// leave English in the middle of a Bangla page: the outage states, the
// refund and plan rules, the API's own answers and the charts' month names.
const KEYS = [
  "The server didn't answer. Nothing was changed.",
  "Couldn't load payments",
  "Couldn't load invoices",
  "Couldn't load these figures",
  "Couldn't load plans",
  "Couldn't load who is on each plan",
  "Couldn't load coupons",
  "Clear filters",
  "Try again",
  "ID, name, email or ref",
  "No payments yet.",
  "No invoices in these dates.",
  "Download every payment that matches the filters as CSV",
  "Download every invoice that matches the filters as CSV",
  "Nothing is charged now. The {amount} payment goes back to Waiting until {gateway} confirms it, and it can't be marked as paid from here.",
  "Only failed payments can be retried",
  "Only successful payments can be refunded",
  "This payment has already been refunded",
  "Refund amount cannot exceed the original payment amount",
  "Explain why (at least 5 characters)",
  "More than this payment",
  "{gateway} reference: {ref}",
  "Started at",
  "Partly refunded: {amount}",
  "Partly refunded",
  "Find them in Users",
  "See all their payments",
  "Payment not found",
  "This payment doesn't exist, or was removed.",
  "Invoice not found",
  "This invoice doesn't exist, or was removed.",
  "All invoices",
  "Showing {range} of {total} invoices",
  "REFUNDED",
  "PARTLY REFUNDED",
  "Refunded {amount} on {date}.",
  "In taka, from payments",
  "MRR at the end of each month",
  "MRR, ARR and churn count the workspaces on paid plans now. The change on last month, the chart, paid people and the average per person come from payments, so the two can differ.",
  "{count} refund this month: {amount}",
  "{count} refunds this month: {amount}",
  "Plans & coupons",
  "{count} person on it now",
  "{count} people on it now",
  "{count} person is on it. Take it off sale instead.",
  "{count} people are on it. Take it off sale instead.",
  "A new price applies from each person's next payment. Everyone on it now keeps {price} until they renew.",
  "Use at least one English letter or number",
  "Another plan already has this name",
  "Must be 0 or more",
  "Display order",
  "A whole number from 0 to 9999",
  "Where it sits among the plans, 0 first.",
  "Where it sits among the plans, 0 first. Leave it blank to put it last.",
  "Counted from payments",
  "Paid people per plan at the end of each month: {months}",
  "Out of {count} payment",
  "Turn off",
  "Turn {code} off?",
  "It stops working at checkout. The payments that used it keep it, and you can turn it back on from Edit.",
  "Coupon turned off",
  "Failed to turn the coupon off",
  "A coupon with this code already exists",
  "Works at checkout",
  "Payments, coupons or workspaces still use this plan. Take it off sale instead.",
  "Plan not found",
  "Coupon not found",
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

describe("the money pages' Bangla", () => {
  it.each(KEYS)("words %s", (key) => {
    expect(bnAdminScopeDictionary[key], key).toBeTruthy();
  });

  it("names every month on a chart's axis", () => {
    for (const month of MONTHS) {
      expect(bnAdminScopeDictionary[`${month}@@month`], month).toBeTruthy();
    }
  });
});
