import { describe, expect, it } from "vitest";
import { bnDictionary } from "@/lib/i18n/dictionary";
import { referralsDictionary } from "@/lib/i18n/dictionary/referrals";
import { savingsGoalsDictionary } from "@/lib/i18n/dictionary/savings-goals";
import { translate } from "@/lib/i18n/translate";
import type { ReferralEntry } from "./api";
import { filterCounts, filterReferrals, friendDay, initials, inviteLink, joinedOn, linkText, listsEveryFriend, nextReadyOn, paidOut, pendingFriends, readyOn, REFERRAL_FILTERS, shareLinks, sortReferrals, STATUS_META } from "./referralDisplay";

const entry = (id: string, status: ReferralEntry["status"], createdAt: string): ReferralEntry => ({ id, name: id, status, rewardAmount: "100.00", createdAt });

describe("referral sums", () => {
  it("works out what has been paid out", () => {
    expect(paidOut({ totalEarned: "1818.00", availableBalance: "1224.00" })).toBe(594);
    expect(paidOut({ totalEarned: "0.00", availableBalance: "0.00" })).toBe(0);
  });

  it("knows when a friend joined and when a pending reward is ready, on the Dhaka calendar", () => {
    // 20:00 UTC on 5 Sep is already 6 Sep in Dhaka.
    expect(joinedOn({ createdAt: "2026-09-05T20:00:00.000Z" })).toBe("2026-09-06");
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

describe("friendDay", () => {
  it("leaves this year's year off and says another year's", () => {
    expect(friendDay("2026-08-14", "2026-10-21", "en")).toBe("14 Aug");
    expect(friendDay("2025-08-14", "2026-10-21", "en")).toBe("14 Aug 2025");
    // A reward ready after New Year says so in December.
    expect(friendDay("2027-01-05", "2026-12-20", "en")).toBe("5 Jan 2027");
  });

  it("writes Bangla months and digits", () => {
    expect(friendDay("2026-08-14", "2026-10-21", "bn")).toBe("১৪ আগস্ট");
    expect(friendDay("2025-08-14", "2026-10-21", "bn")).toBe("১৪ আগস্ট ২০২৫");
  });

  // date-fns throws on a date it can't read, which would take the page down.
  it("gives back anything that isn't a day as it was", () => {
    expect(friendDay("", "2026-10-21", "en")).toBe("");
    expect(friendDay("NaN-NaN-NaN", "2026-10-21", "bn")).toBe("NaN-NaN-NaN");
  });
});

describe("the friend counts", () => {
  const ten = (status: (i: number) => ReferralEntry["status"]) => Array.from({ length: 10 }, (_, i) => entry(`f${i}`, status(i), `2026-10-${String(20 - i).padStart(2, "0")}T06:00:00.000Z`));

  it("counts pending friends straight from a whole list", () => {
    const list = [entry("a", "PENDING", "2026-10-10T06:00:00.000Z"), entry("b", "CONFIRMED", "2026-08-01T06:00:00.000Z")];
    expect(listsEveryFriend({ referralCount: 2, recentReferrals: list })).toBe(true);
    expect(pendingFriends({ referralCount: 2, recentReferrals: list })).toBe(1);
    expect(pendingFriends({ referralCount: 0, recentReferrals: [] })).toBe(0);
  });

  it("trusts a cut list that isn't all pending, since the pending friends are the newest", () => {
    const recentReferrals = ten((i) => (i < 3 ? "PENDING" : "CONFIRMED"));
    expect(listsEveryFriend({ referralCount: 25, recentReferrals })).toBe(false);
    expect(pendingFriends({ referralCount: 25, recentReferrals })).toBe(3);
  });

  it("can't tell from a cut list that is all pending", () => {
    const recentReferrals = ten(() => "PENDING");
    expect(pendingFriends({ referralCount: 25, recentReferrals })).toBeNull();
    expect(nextReadyOn({ referralCount: 25, recentReferrals })).toBeNull();
    // A cut list that came back empty says nothing either.
    expect(pendingFriends({ referralCount: 3, recentReferrals: [] })).toBeNull();
  });

  it("takes the API's own pending count when it sends one", () => {
    const recentReferrals = ten(() => "PENDING");
    expect(pendingFriends({ referralCount: 25, recentReferrals, pendingCount: 12 })).toBe(12);
    // Two pending friends sit past the list: their day comes first and isn't known.
    expect(nextReadyOn({ referralCount: 25, recentReferrals, pendingCount: 12 })).toBeNull();
    expect(nextReadyOn({ referralCount: 25, recentReferrals, pendingCount: 10 })).toBe("2026-11-10");
  });

  it("finds the day the next reward is ready: the oldest pending friend's", () => {
    const list = [entry("new", "PENDING", "2026-10-15T06:00:00.000Z"), entry("old", "PENDING", "2026-10-02T06:00:00.000Z"), entry("done", "CONFIRMED", "2026-08-01T06:00:00.000Z")];
    expect(nextReadyOn({ referralCount: 3, recentReferrals: list })).toBe("2026-11-01");
    expect(nextReadyOn({ referralCount: 1, recentReferrals: [entry("done", "WITHDRAWN", "2026-08-01T06:00:00.000Z")] })).toBeNull();
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

  it("tells a reward to withdraw from one already paid out", () => {
    expect(STATUS_META.CONFIRMED.tone).toBe("income");
    expect(STATUS_META.WITHDRAWN.tone).toBe("neutral");
    expect(STATUS_META.PENDING.tone).toBe("warning");
  });

  it("words every status, filter and note in Bangla, in English without the context", () => {
    const keys = [...REFERRAL_FILTERS.map((option) => option.label), ...Object.values(STATUS_META).flatMap((meta) => [meta.label, meta.note])];
    for (const key of keys) expect(bnDictionary[key], key).toBeTruthy();
    expect(translate("en", "Available@@referral")).toBe("Available");
    expect(translate("en", "Paid out@@referral")).toBe("Paid out");
  });

  // The keys are one namespace and referrals is spread after savings, so a
  // plain word here would reword the Savings pages too.
  it("leaves the plain words the Savings pages use to them", () => {
    for (const word of ["Available", "Paid out", "Withdrawn", "Withdraw"]) expect(Object.hasOwn(referralsDictionary, word), word).toBe(false);
    expect(translate("bn", "Paid out")).toBe(savingsGoalsDictionary["Paid out"]);
    expect(translate("bn", "Withdrawn")).toBe(savingsGoalsDictionary.Withdrawn);
  });

  // The withdraw dialog's button and its wallets error are the Savings
  // pages' words, the rest shared ones: a rename there would leave them in
  // English here.
  it("finds Bangla for the words it borrows", () => {
    for (const key of ["Withdraw {amount}", "Couldn't load your wallets.", "All", "Email", "Copy", "Cancel", "Close", "Status", "Try again", "More", "Loading..."]) expect(bnDictionary[key], key).toBeTruthy();
  });

  // A Bangla sentence that lost {count} or {date} would show the wrong
  // figure, or none.
  it("keeps every {placeholder} of the English in its Bangla", () => {
    const placeholders = (text: string) => [...text.matchAll(/(?<!\{)\{(\w+)\}(?!\})/g)].map((match) => match[1]).sort();
    for (const [english, bangla] of Object.entries(referralsDictionary)) expect(placeholders(bangla), english).toEqual(placeholders(english));
  });

  it("words the backend's refusals to withdraw", () => {
    for (const message of ["No available balance to withdraw.", "Account not found in this workspace", "Must be a General (cash/bank/mobile money) or Savings account", "Failed to withdraw earnings"]) {
      expect(bnDictionary[message], message).toBeTruthy();
    }
  });
});

describe("links", () => {
  it("builds the invite link and the share links", () => {
    expect(inviteLink("https://smartly.softech.agency/", "9AAD7001")).toBe("https://smartly.softech.agency/register?ref=9AAD7001");
    expect(linkText("https://smartly.softech.agency/register?ref=9AAD7001")).toBe("smartly.softech.agency/register?ref=9AAD7001");
    const links = shareLinks("https://x.test/register?ref=A1", "Join me on Smartly:", "Try Smartly");
    expect(links.whatsapp).toBe("https://wa.me/?text=Join%20me%20on%20Smartly%3A%20https%3A%2F%2Fx.test%2Fregister%3Fref%3DA1");
    expect(links.email).toContain("mailto:?subject=Try%20Smartly&body=");
  });

  it("shares on Messenger through its app and on Facebook through its share page, neither with an app id", () => {
    const links = shareLinks("https://x.test/register?ref=A1", "Join me on Smartly:", "Try Smartly");
    expect(links.messenger).toBe("fb-messenger://share/?link=https%3A%2F%2Fx.test%2Fregister%3Fref%3DA1");
    expect(links.facebook).toBe("https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fx.test%2Fregister%3Fref%3DA1");
    expect(Object.values(links).join(" ")).not.toContain("app_id");
  });
});
