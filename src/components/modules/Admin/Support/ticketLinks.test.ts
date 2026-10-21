import { describe, expect, it } from "vitest";
import { buildAssigneeOptions } from "./Tickets/ticketsTable.config";
import { hasTicketFilters, requesterTicketsHref, ticketHref, ticketsBackHref } from "./ticketLinks";

describe("ticketHref", () => {
  it("opens the ticket, carrying the queue's query when there is one", () => {
    expect(ticketHref("abc")).toBe("/admin/support/abc");
    expect(ticketHref("abc", "status=WAITING_ON_USER&page=3")).toBe("/admin/support/abc?back=status%3DWAITING_ON_USER%26page%3D3");
  });
});

describe("ticketsBackHref", () => {
  it("returns to the same tab, filters and page", () => {
    expect(ticketsBackHref("status=WAITING_ON_USER&page=3&search=rafi")).toBe("/admin/support?status=WAITING_ON_USER&page=3&search=rafi");
  });

  it("keeps only the queue's own params", () => {
    expect(ticketsBackHref("page=2&next=https://evil.example&utm_source=x")).toBe("/admin/support?page=2");
    expect(ticketsBackHref("//evil.example")).toBe("/admin/support");
  });

  it("falls back to the plain queue", () => {
    expect(ticketsBackHref(undefined)).toBe("/admin/support");
    expect(ticketsBackHref("")).toBe("/admin/support");
    expect(ticketsBackHref(["page=4", "page=5"])).toBe("/admin/support?page=4");
  });
});

describe("requesterTicketsHref", () => {
  it("lists the open ones while any are open, else the solved", () => {
    expect(requesterTicketsHref("rafi@example.com", { total: 3, solved: 2 })).toBe("/admin/support?search=rafi%40example.com");
    expect(requesterTicketsHref("rafi@example.com", { total: 3, solved: 3 })).toBe("/admin/support?search=rafi%40example.com&status=DONE");
  });
});

describe("hasTicketFilters", () => {
  const params = (query: string) => new URLSearchParams(query);

  it("reads the default tab as no filter", () => {
    expect(hasTicketFilters(params(""))).toBe(false);
    expect(hasTicketFilters(params("status=IN_QUEUE&page=2"))).toBe(false);
  });

  it("sees another tab, a search or a chip", () => {
    expect(hasTicketFilters(params("status=DONE"))).toBe(true);
    expect(hasTicketFilters(params("search=rafi"))).toBe(true);
    expect(hasTicketFilters(params("priority=URGENT"))).toBe(true);
  });
});

describe("buildAssigneeOptions", () => {
  const admins = [
    { id: "a1", name: "Nadia", role: "SUPPORT_ADMIN" as const },
    { id: "a2", name: "Rafi", role: "SUPER_ADMIN" as const },
  ];

  it("puts the reader first as Me", () => {
    expect(buildAssigneeOptions(admins, "a2")).toEqual([
      { value: "a2", label: "Me" },
      { value: "a1", label: "Nadia" },
    ]);
  });

  it("lists the roster as it is for someone not on it", () => {
    expect(buildAssigneeOptions(admins, null).map((option) => option.label)).toEqual(["Nadia", "Rafi"]);
  });
});
