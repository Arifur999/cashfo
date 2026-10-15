import { describe, expect, it } from "vitest";
import type { ReferralEntry } from "./api";
import { filterCounts, filterReferrals, initials, inviteLink, linkText, paidOut, readyOn, shareLinks, sortReferrals } from "./referralDisplay";

const entry = (id: string, status: ReferralEntry["status"], createdAt: string): ReferralEntry => ({ id, name: id, status, rewardAmount: "100.00", createdAt });

describe("referral sums", () => {
  it("works out what has been paid out", () => {
    expect(paidOut({ totalEarned: "1818.00", availableBalance: "1224.00" })).toBe(594);
    expect(paidOut({ totalEarned: "0.00", availableBalance: "0.00" })).toBe(0);
  });

  it("knows when a pending reward is ready, on the Dhaka calendar", () => {
    // 20:00 UTC on 5 Sep is already 6 Sep in Dhaka.
    expect(readyOn({ createdAt: "2026-09-05T20:00:00.000Z" })).toBe("2026-10-06");
    expect(readyOn({ createdAt: "2026-09-26T04:00:00.000Z" })).toBe("2026-10-26");
  });

  it("makes initials", () => {
    expect(initials("Sabrina Haque")).toBe("SH");
    expect(initials("bKash")).toBe("B");
    expect(initials("  ")).toBe("?");
    expect(initials("Md Abdul Karim")).toBe("MA");
  });
});

describe("the friends list", () => {
  const entries = [entry("a", "PENDING", "2026-09-26T00:00:00.000Z"), entry("b", "CONFIRMED", "2026-09-18T00:00:00.000Z"), entry("c", "WITHDRAWN", "2026-08-14T00:00:00.000Z"), entry("d", "CONFIRMED", "2026-09-02T00:00:00.000Z")];

  it("filters and counts by status", () => {
    expect(filterReferrals(entries, "ALL")).toHaveLength(4);
    expect(filterReferrals(entries, "CONFIRMED").map((e) => e.id)).toEqual(["b", "d"]);
    expect(filterCounts(entries)).toEqual({ ALL: 4, PENDING: 1, CONFIRMED: 2, WITHDRAWN: 1 });
  });

  it("sorts newest first", () => {
    expect(sortReferrals(entries).map((e) => e.id)).toEqual(["a", "b", "d", "c"]);
  });
});

describe("links", () => {
  it("builds the invite link and the share links", () => {
    expect(inviteLink("https://smartly.softech.agency/", "9AAD7001")).toBe("https://smartly.softech.agency/register?ref=9AAD7001");
    expect(linkText("https://smartly.softech.agency/register?ref=9AAD7001")).toBe("smartly.softech.agency/register?ref=9AAD7001");
    const links = shareLinks("https://x.test/register?ref=A1", "Join me on Smartly:", "Try Smartly");
    expect(links.whatsapp).toBe("https://wa.me/?text=Join%20me%20on%20Smartly%3A%20https%3A%2F%2Fx.test%2Fregister%3Fref%3DA1");
    expect(links.email).toContain("mailto:?subject=Try%20Smartly&body=");
    expect(links.messenger).toContain("facebook.com/dialog/send?link=");
  });
});
