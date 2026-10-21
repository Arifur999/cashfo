import { describe, expect, it } from "vitest";
import { type FillValues, fillText } from "@/lib/i18n/fill";
import { inEnglish } from "@/lib/i18n/message";
import { translate } from "@/lib/i18n/translate";
import {
  countPhrase,
  failedSinceDay,
  hasAnyParam,
  listQuery,
  PAYMENT_NARROWING_KEYS,
  paymentHref,
  paymentsListHref,
  refundExtent,
  stepTimePattern,
} from "./paymentsDisplay";

// The admin panel's Bangla, as the Translate a Bangla reader's pages get.
const bangla = (key: string, values?: FillValues) => {
  const text = translate("bn", key, undefined, "admin");
  return values ? fillText(text, values) : text;
};

describe("countPhrase", () => {
  it("picks the English form by count", () => {
    expect(countPhrase(inEnglish, "en", 1, "{count} payment", "{count} payments")).toBe("1 payment");
    expect(countPhrase(inEnglish, "en", 0, "{count} payment", "{count} payments")).toBe("0 payments");
    expect(countPhrase(inEnglish, "en", 1912, "{count} payment", "{count} payments")).toBe("1,912 payments");
  });

  it("writes the count in Bangla digits for a Bangla reader", () => {
    expect(countPhrase(bangla, "bn", 1912, "{count} payment", "{count} payments")).toBe("১,৯১২টি পেমেন্ট");
  });

  it("fills the sentence's other values too", () => {
    expect(countPhrase(inEnglish, "en", 3, "{count} refund in {month}", "{count} refunds in {month}", { month: "October" })).toBe("3 refunds in October");
  });
});

describe("listQuery", () => {
  it("keeps the list's own params, in order", () => {
    expect(listQuery("status=FAILED&page=3&gateway=BKASH")).toBe("status=FAILED&page=3&gateway=BKASH");
    expect(listQuery("search=PAY-3F2A&dateFrom=2026-09-01&dateTo=2026-09-30&limit=25")).toBe("search=PAY-3F2A&dateFrom=2026-09-01&dateTo=2026-09-30&limit=25");
  });

  it("drops anything else, and empty values", () => {
    expect(listQuery("status=FAILED&utm_source=mail&view=")).toBe("status=FAILED");
    expect(listQuery("https://evil.example/?status=FAILED")).toBe("");
    expect(listQuery("")).toBe("");
    expect(listQuery(null)).toBe("");
    expect(listQuery(undefined)).toBe("");
  });
});

describe("paymentHref", () => {
  it("is the plain page from an unfiltered list", () => {
    expect(paymentHref("9f3c2a1b")).toBe("/admin/payments/9f3c2a1b");
    expect(paymentHref("9f3c2a1b", "")).toBe("/admin/payments/9f3c2a1b");
    expect(paymentHref("9f3c2a1b", "utm_source=mail")).toBe("/admin/payments/9f3c2a1b");
  });

  it("carries the list's query in ?back=", () => {
    const href = paymentHref("9f3c2a1b", "status=FAILED&page=3");
    expect(href).toBe("/admin/payments/9f3c2a1b?back=status%3DFAILED%26page%3D3");
    expect(new URLSearchParams(href.split("?")[1]).get("back")).toBe("status=FAILED&page=3");
  });
});

describe("paymentsListHref", () => {
  it("goes back to the list as it was left", () => {
    expect(paymentsListHref("status=FAILED&page=3")).toBe("/admin/payments?status=FAILED&page=3");
    expect(paymentsListHref(["gateway=NAGAD", "status=FAILED"])).toBe("/admin/payments?gateway=NAGAD");
  });

  it("can only ever lead to the list", () => {
    expect(paymentsListHref("//evil.example")).toBe("/admin/payments");
    expect(paymentsListHref("javascript:alert(1)")).toBe("/admin/payments");
    expect(paymentsListHref(undefined)).toBe("/admin/payments");
  });
});

describe("hasAnyParam", () => {
  it("says whether the list is narrowed beyond its status tab", () => {
    expect(hasAnyParam(new URLSearchParams("status=FAILED&page=2"), PAYMENT_NARROWING_KEYS)).toBe(false);
    expect(hasAnyParam(new URLSearchParams("gateway=BKASH"), PAYMENT_NARROWING_KEYS)).toBe(true);
    expect(hasAnyParam(new URLSearchParams("dateTo=2026-09-30"), PAYMENT_NARROWING_KEYS)).toBe(true);
    expect(hasAnyParam(new URLSearchParams("search="), PAYMENT_NARROWING_KEYS)).toBe(false);
  });
});

describe("failedSinceDay", () => {
  it("is the Dhaka day the last 7 days start on", () => {
    expect(failedSinceDay(Date.parse("2026-10-21T04:00:00Z"))).toBe("2026-10-14");
    // 01:00 on the 21st in Dhaka is still the 20th in UTC; a week before
    // is 01:00 on the 14th in Dhaka.
    expect(failedSinceDay(Date.parse("2026-10-20T19:00:00Z"))).toBe("2026-10-14");
  });
});

describe("stepTimePattern", () => {
  it("keeps the seconds on the payment's own Dhaka day", () => {
    expect(stepTimePattern("2026-10-01T04:14:02Z", "2026-10-01T04:14:00Z")).toBe("h:mm:ss aaa");
  });

  it("adds the day for a step made on another day", () => {
    expect(stepTimePattern("2026-10-04T09:10:00Z", "2026-10-01T04:14:00Z")).toBe("d MMM, h:mm aaa");
    // 19:00 UTC is already the next day in Dhaka (UTC+6).
    expect(stepTimePattern("2026-10-01T19:00:00Z", "2026-10-01T04:14:00Z")).toBe("d MMM, h:mm aaa");
  });
});

describe("refundExtent", () => {
  it("tells a full refund from a partial one", () => {
    expect(refundExtent("299.00", null)).toBe("none");
    expect(refundExtent("299.00", { amount: "299.00" })).toBe("full");
    expect(refundExtent("299.00", { amount: "50.00" })).toBe("part");
    expect(refundExtent(239.2, { amount: "239.20" })).toBe("full");
  });
});
