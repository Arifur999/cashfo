import { describe, expect, it } from "vitest";
import type { ITicketStats } from "@/types/ticket.types";
import { buildAssigneeOptions, buildTicketsTableConfig, ticketsQueryString, UNASSIGNED } from "./Tickets/ticketsTable.config";
import { AWAITING_REPLY_HREF, hasTicketFilters, requesterTicketsHref, ticketHref, ticketsBackHref, ticketStatusHref } from "./ticketLinks";

describe("ticketHref", () => {
  it("opens the ticket, carrying the queue's query when there is one", () => {
    expect(ticketHref("abc")).toBe("/admin/support/abc");
    expect(ticketHref("abc", "status=WAITING_ON_USER&page=3")).toBe("/admin/support/abc?back=status%3DWAITING_ON_USER%26page%3D3");
  });
});

describe("ticketsBackHref", () => {
  it("returns to the same tab, filters and page", () => {
    expect(ticketsBackHref("status=WAITING_ON_USER&page=3&search=rafi")).toBe("/admin/support?status=WAITING_ON_USER&page=3&search=rafi");
    expect(ticketsBackHref("assignedToAdminId=none&awaitingReply=true&sort=waiting")).toBe("/admin/support?assignedToAdminId=none&awaitingReply=true&sort=waiting");
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

describe("the figures' links", () => {
  it("open a tab, or what needs a reply", () => {
    expect(ticketStatusHref("WAITING_ON_USER")).toBe("/admin/support?status=WAITING_ON_USER");
    expect(AWAITING_REPLY_HREF).toBe("/admin/support?status=NEEDS_REPLY");
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
    expect(hasTicketFilters(params("assignedToAdminId=none"))).toBe(true);
    expect(hasTicketFilters(params("awaitingReply=true"))).toBe(true);
  });

  it("doesn't count the order as a filter", () => {
    expect(hasTicketFilters(params("sort=waiting"))).toBe(false);
  });
});

describe("buildAssigneeOptions", () => {
  const admins = [
    { id: "a1", name: "Nadia", role: "SUPPORT_ADMIN" as const },
    { id: "a2", name: "Rafi", role: "SUPER_ADMIN" as const },
  ];

  it("puts the reader first as Me, then the tickets nobody has", () => {
    expect(buildAssigneeOptions(admins, "a2")).toEqual([
      { value: "a2", label: "Me" },
      { value: UNASSIGNED, label: "Unassigned" },
      { value: "a1", label: "Nadia", raw: true },
    ]);
  });

  it("lists the roster as it is for someone not on it", () => {
    expect(buildAssigneeOptions(admins, null).map((option) => option.label)).toEqual(["Unassigned", "Nadia", "Rafi"]);
    expect(UNASSIGNED).toBe("none");
  });
});

describe("buildTicketsTableConfig", () => {
  it("draws the board's five tabs, the need-a-reply count from the stats", () => {
    const stats = { needsReplyCount: 8, statusCounts: { OPEN: 9, IN_PROGRESS: 6, WAITING_ON_USER: 4, RESOLVED: 20, CLOSED: 3 } } as unknown as ITicketStats;
    const tabs = buildTicketsTableConfig([], stats).filters?.find((filter) => filter.id === "status");
    expect(tabs?.type === "tabs" && tabs.options.map((tab) => [tab.label, tab.count])).toEqual([
      ["All open", 19],
      ["Need a reply", 8],
      ["In progress", 6],
      ["Waiting on user", 4],
      ["Resolved", 23],
    ]);
  });

  it("shows the search box only while the URL searches", () => {
    expect(buildTicketsTableConfig([]).search).toBeUndefined();
    expect(buildTicketsTableConfig([], undefined, null, true).search).toBeDefined();
  });
});

describe("ticketsQueryString", () => {
  it("spells the need-a-reply tab out as the queue's filters", () => {
    expect(ticketsQueryString(new URLSearchParams("status=NEEDS_REPLY"))).toBe("page=1&limit=10&status=IN_QUEUE&awaitingReply=true&sort=waiting");
    expect(ticketsQueryString(new URLSearchParams(""))).toBe("page=1&limit=10&status=IN_QUEUE");
  });
});
