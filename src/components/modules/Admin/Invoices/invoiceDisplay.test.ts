import { describe, expect, it } from "vitest";
import type { IInvoiceDetail } from "@/types/invoice.types";
import { invoiceHref, invoiceListQuery, invoicePaymentStatus, invoicesListHref, invoiceStamp, splitIssuedTo } from "./invoiceDisplay";

describe("invoiceListQuery", () => {
  it("keeps the list's dates and page, in order", () => {
    expect(invoiceListQuery("dateFrom=2026-09-01&dateTo=2026-09-30&page=3&limit=25")).toBe("dateFrom=2026-09-01&dateTo=2026-09-30&page=3&limit=25");
  });

  it("drops anything else, and empty values", () => {
    // The invoices list has no status or search of its own.
    expect(invoiceListQuery("status=FAILED&search=INV&page=2&dateTo=")).toBe("page=2");
    expect(invoiceListQuery("https://evil.example/?page=2")).toBe("");
    expect(invoiceListQuery(null)).toBe("");
  });
});

describe("invoiceHref", () => {
  it("is the plain page from an unfiltered list", () => {
    expect(invoiceHref("inv-1")).toBe("/admin/invoices/inv-1");
    expect(invoiceHref("inv-1", "")).toBe("/admin/invoices/inv-1");
    expect(invoiceHref("inv-1", "utm_source=mail")).toBe("/admin/invoices/inv-1");
  });

  it("carries the list's query in ?back=", () => {
    const href = invoiceHref("inv-1", "dateFrom=2026-09-01&page=2");
    expect(href).toBe("/admin/invoices/inv-1?back=dateFrom%3D2026-09-01%26page%3D2");
    expect(new URLSearchParams(href.split("?")[1]).get("back")).toBe("dateFrom=2026-09-01&page=2");
  });
});

describe("invoicesListHref", () => {
  it("goes back to the list as it was left", () => {
    expect(invoicesListHref("dateFrom=2026-09-01&page=2")).toBe("/admin/invoices?dateFrom=2026-09-01&page=2");
    expect(invoicesListHref(["page=4", "page=9"])).toBe("/admin/invoices?page=4");
  });

  it("can only ever lead to the list", () => {
    expect(invoicesListHref("//evil.example")).toBe("/admin/invoices");
    expect(invoicesListHref("javascript:alert(1)")).toBe("/admin/invoices");
    expect(invoicesListHref(undefined)).toBe("/admin/invoices");
  });
});

describe("splitIssuedTo", () => {
  it("puts the name and the email on their own lines", () => {
    expect(splitIssuedTo("Mahbub Alam <mahbub@example.com>")).toEqual({ name: "Mahbub Alam", email: "mahbub@example.com" });
    expect(splitIssuedTo("  Sharmin Akter<sharmin@example.com>  ")).toEqual({ name: "Sharmin Akter", email: "sharmin@example.com" });
  });

  it("keeps anything else as the name", () => {
    expect(splitIssuedTo("Rahim Traders")).toEqual({ name: "Rahim Traders", email: null });
    expect(splitIssuedTo("Rahim <not an email>")).toEqual({ name: "Rahim <not an email>", email: null });
  });

  it("shows a bare email as the name", () => {
    expect(splitIssuedTo("<mahbub@example.com>")).toEqual({ name: "mahbub@example.com", email: null });
  });
});

describe("invoicePaymentStatus", () => {
  const invoice = (payment: unknown) => ({ payment }) as unknown as IInvoiceDetail;

  it("reads the status the API sends with the payment", () => {
    expect(invoicePaymentStatus(invoice({ id: "p1", status: "REFUNDED", plan: { id: "x", name: "Monthly Pro" } }))).toBe("REFUNDED");
  });

  it("has none without it", () => {
    expect(invoicePaymentStatus(invoice({ id: "p1", plan: { id: "x", name: "Monthly Pro" } }))).toBeUndefined();
    expect(invoicePaymentStatus(invoice(null))).toBeUndefined();
  });
});

describe("invoiceStamp", () => {
  it("stamps a kept payment PAID", () => {
    expect(invoiceStamp("299.00", false)).toBe("paid");
    expect(invoiceStamp("299.00", false, null)).toBe("paid");
  });

  it("stamps the whole amount back REFUNDED", () => {
    expect(invoiceStamp("299.00", true, { amount: "299.00" })).toBe("refunded");
    expect(invoiceStamp("239.20", true, { amount: 239.2 })).toBe("refunded");
  });

  it("stamps part of it back PARTLY REFUNDED", () => {
    expect(invoiceStamp("299.00", true, { amount: "50.00" })).toBe("partly-refunded");
  });

  it("stamps a refund it couldn't read REFUNDED", () => {
    expect(invoiceStamp("299.00", true, null)).toBe("refunded");
  });
});
