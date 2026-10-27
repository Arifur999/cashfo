import { describe, expect, it } from "vitest";
import { bnDictionary } from "@/lib/i18n/dictionary";
import { referralsDictionary } from "@/lib/i18n/dictionary/referrals";
import { savingsGoalsDictionary } from "@/lib/i18n/dictionary/savings-goals";
import { translate } from "@/lib/i18n/translate";
import type { ReferralInfo } from "./api";
import {
  addWorkingDays,
  amountChips,
  amountProblem,
  balancesOf,
  bankShortName,
  CANCEL_NOTES,
  destinationLine,
  earningSince,
  filterFriends,
  FRIEND_STATUS,
  FRIEND_TABS,
  friendDay,
  friendNote,
  friendTabCounts,
  formatWalletNumber,
  initials,
  inviteLink,
  legacyBonusLeft,
  linkText,
  maskEmail,
  maskWallet,
  methodProblem,
  normaliseMobile,
  notBoughtLine,
  PAYOUT_STATUS,
  programOf,
  shareLinks,
  showsLockedPage,
  speedOf,
  tabFromQuery,
} from "./referralDisplay";
import type { ReferralFriend, ReferralProgramInfo } from "./referralTypes";

const OLD: ReferralInfo = { referralCode: "9AAD7001", totalEarned: "1818.00", pendingEarnings: "540.00", availableBalance: "1224.00", referralCount: 9, rewardAmountPerReferral: "100.00", recentReferrals: [] };

const friend = (over: Partial<ReferralFriend>): ReferralFriend => ({
  id: "f",
  name: "Imran Hossain",
  joinedAt: "2026-09-30T06:00:00.000Z",
  kind: "COMMISSION",
  status: "JOINED",
  filter: "NOT_YET",
  planName: null,
  currentPlanName: null,
  boughtAt: null,
  paidAmount: null,
  commissionAmount: null,
  paidOutAmount: "0.00",
  availableAt: null,
  cancelReason: null,
  cancelledAt: null,
  paidOutAt: null,
  refunded: false,
  ...over,
});

describe("the program's numbers", () => {
  it("falls back to the old rule's figures for an older backend", () => {
    expect(programOf(OLD)).toMatchObject({ live: true, commissionPct: 20, friendDiscountPct: 10, holdDays: 7, minWithdrawal: 500, fee: 0, payWithinDays: 3 });
    expect(balancesOf(OLD)).toMatchObject({ available: 1224, pending: 540, totalEarned: 1818, paidOut: 594 });
  });

  it("reads the new balances when sent", () => {
    const info: ReferralProgramInfo = { ...OLD, balances: { available: "224.00", reserved: "1000.00", pending: "540.00", pendingNextAt: null, totalEarned: "1818.00", paidOut: "594.00", lastPaidAt: null } };
    expect(balancesOf(info)).toMatchObject({ available: 224, reserved: 1000, paidOut: 594 });
  });

  it("shows the Free-plan page only to a locked member with nothing from the program", () => {
    const empty = { ...OLD, totalEarned: "0", pendingEarnings: "0", availableBalance: "0", referralCount: 0 };
    expect(showsLockedPage({ ...empty, lockedReason: "FREE_PLAN" })).toBe(true);
    expect(showsLockedPage({ ...empty, lockedReason: null })).toBe(false);
    // Money or friends from before keep the dashboard, so it can be withdrawn.
    expect(showsLockedPage({ ...OLD, lockedReason: "FREE_PLAN" })).toBe(false);
    expect(showsLockedPage({ ...empty, referralCount: 1, lockedReason: "PROGRAM_OFF" })).toBe(false);
  });
});

describe("friends", () => {
  const list = [
    friend({ id: "a", filter: "NOT_YET" }),
    friend({ id: "b", name: "Tanvir Islam", filter: "NOT_YET" }),
    friend({ id: "c", status: "PENDING", filter: "BOUGHT", availableAt: "2026-10-04T20:00:00.000Z", boughtAt: "2026-09-28T06:00:00.000Z", commissionAmount: "540.00" }),
    friend({ id: "d", status: "CANCELLED", filter: "REFUNDED", cancelReason: "FRIEND_REFUNDED", cancelledAt: "2026-09-06T06:00:00.000Z", refunded: true, boughtAt: "2026-09-03T06:00:00.000Z" }),
    friend({ id: "e", kind: "SIGNUP_BONUS", status: "AVAILABLE", filter: "OTHER", commissionAmount: "100.00", paidOutAmount: "40.00", joinedAt: "2026-08-02T06:00:00.000Z" }),
  ];

  it("filters and counts by tab", () => {
    expect(filterFriends(list, "NOT_YET").map((f) => f.id)).toEqual(["a", "b"]);
    expect(friendTabCounts(OLD, list)).toEqual({ ALL: 5, BOUGHT: 1, NOT_YET: 2, REFUNDED: 1 });
    expect(friendTabCounts({ ...OLD, friendCounts: { all: 9, bought: 6, notYet: 2, refunded: 1 } }, list)).toEqual({ ALL: 9, BOUGHT: 6, NOT_YET: 2, REFUNDED: 1 });
  });

  it("dates each note on the app's calendar", () => {
    // 20:00 UTC on 4 Oct is 5 Oct in Dhaka.
    expect(friendNote(list[2])).toEqual({ note: "Ready on {date}", day: "2026-10-05" });
    expect(friendNote(list[3])).toEqual({ note: "Refunded on {date}", day: "2026-09-06" });
    expect(friendNote(friend({ currentPlanName: "Free" }))).toEqual({ note: "On the {plan} plan", day: null, plan: "Free" });
    expect(friendNote(friend({ status: "CANCELLED", cancelReason: "SELF_REFERRAL" }))).toEqual({ note: CANCEL_NOTES.SELF_REFERRAL, day: null });
  });

  it("names the friends who haven't bought", () => {
    expect(notBoughtLine([])).toBeNull();
    expect(notBoughtLine(list.slice(0, 2))).toEqual({ key: "{name} and {other} joined but haven't bought a plan yet.", values: { name: "Imran", other: "Tanvir" } });
    expect(notBoughtLine([...list.slice(0, 2), friend({ name: "Mahin Rahman" }), friend({ name: "Rakib" })])?.values).toEqual({ name: "Imran", other: "Tanvir", count: 2 });
  });

  it("finds what the old sign-up bonus still holds, and when earning began", () => {
    expect(legacyBonusLeft(list)).toBe(60);
    expect(earningSince(list)).toBe("2026-08-02");
    expect(earningSince(list.slice(0, 2))).toBeNull();
  });

  it("writes days this year without the year", () => {
    expect(friendDay("2026-08-14", "2026-10-21", "en")).toBe("14 Aug");
    expect(friendDay("2025-08-14", "2026-10-21", "en")).toBe("14 Aug 2025");
    expect(friendDay("2026-08-14", "2026-10-21", "bn")).toBe("১৪ আগস্ট");
    expect(friendDay("", "2026-10-21", "en")).toBe("");
  });

  it("makes initials", () => {
    expect(initials("Sabrina Haque")).toBe("SH");
    expect(initials("  ")).toBe("?");
  });
});

describe("payout methods", () => {
  it("writes numbers and masks as the boards do", () => {
    expect(formatWalletNumber("01711482915")).toBe("01711-482915");
    expect(maskWallet("01711482915")).toBe("01711-•••915");
    expect(destinationLine({ type: "BKASH", walletNumber: "01711482915", bankName: null, accountNumber: null })).toBe("bKash 01711-•••915");
    expect(destinationLine({ type: "BANK", walletNumber: null, bankName: "Dutch-Bangla Bank", accountNumber: "150320414417" })).toBe("DBBL •••• 4417");
    expect(maskEmail("tanvir@example.com")).toBe("t***@example.com");
  });

  it("knows the banks' short names, and makes one up from the initials", () => {
    expect(bankShortName("Dutch-Bangla Bank")).toBe("DBBL");
    expect(bankShortName("BRAC Bank PLC")).toBe("BRAC");
    expect(bankShortName("Midland Bank")).toBe("MB");
    expect(bankShortName(null)).toBe("BANK");
  });

  it("checks a method before the API does", () => {
    const base = { accountName: "Khaled Mahmud", walletNumber: "", bankName: "", bankAccountType: "SAVINGS", accountNumber: "", routingNumber: "" };
    expect(methodProblem({ ...base, type: "BKASH", walletNumber: "+880 1711-482915" })).toBeNull();
    expect(normaliseMobile("+880 1711-482915")).toBe("01711482915");
    expect(methodProblem({ ...base, type: "NAGAD", walletNumber: "0171148291" })?.field).toBe("walletNumber");
    expect(methodProblem({ ...base, type: "ROCKET", walletNumber: "017114829159" })).toBeNull();
    expect(methodProblem({ ...base, type: "BANK", bankName: "BRAC Bank", accountNumber: "1503 2041 2201", routingNumber: "060261726" })).toBeNull();
    expect(methodProblem({ ...base, type: "BANK", bankName: "BRAC Bank", accountNumber: "1503", routingNumber: "060261726" })?.field).toBe("accountNumber");
    expect(methodProblem({ ...base, type: "BANK", bankName: "BRAC Bank", accountNumber: "150320412201", routingNumber: "0602" })?.field).toBe("routingNumber");
    expect(methodProblem({ ...base, type: "BKASH", accountName: "K" })?.field).toBe("accountName");
  });
});

describe("withdrawing", () => {
  it("offers the smallest, a round sum and everything", () => {
    expect(amountChips(1224, 500)).toEqual([
      { value: 500, all: false },
      { value: 1000, all: false },
      { value: 1224, all: true },
    ]);
    expect(amountChips(800, 500)).toEqual([
      { value: 500, all: false },
      { value: 800, all: true },
    ]);
    expect(amountChips(400, 500)).toEqual([]);
  });

  it("says what is wrong with an amount", () => {
    expect(amountProblem(0, 1224, 500, 0)).toBe("EMPTY");
    expect(amountProblem(499, 1224, 500, 0)).toBe("BELOW_MINIMUM");
    expect(amountProblem(1300, 1224, 500, 0)).toBe("ABOVE_AVAILABLE");
    expect(amountProblem(500, 1224, 500, 500)).toBe("FEE_EXCEEDS_AMOUNT");
    expect(amountProblem(1000, 1224, 500, 0)).toBeNull();
  });

  it("counts working days Sunday to Thursday, as the API does", () => {
    // Thursday 1 Oct + 3 working days = Tuesday 6 Oct.
    expect(addWorkingDays("2026-10-01", 3)).toBe("2026-10-06");
    expect(addWorkingDays("2026-10-02", 1)).toBe("2026-10-04");
    expect(speedOf("BKASH", 3)).toEqual({ from: 1, to: 3 });
    expect(speedOf("BANK", 3)).toEqual({ from: 2, to: 3 });
  });

  it("opens the tab the link asks for", () => {
    expect(tabFromQuery("withdrawals")).toBe("withdrawals");
    expect(tabFromQuery(undefined)).toBe("overview");
    expect(tabFromQuery(["withdrawals"])).toBe("overview");
  });
});

describe("links", () => {
  it("builds the invite link and the share links", () => {
    expect(inviteLink("https://smartly.softech.agency/", "9AAD7001")).toBe("https://smartly.softech.agency/register?ref=9AAD7001");
    expect(linkText("https://smartly.softech.agency/register?ref=9AAD7001")).toBe("smartly.softech.agency/register?ref=9AAD7001");
    const links = shareLinks("https://x.test/register?ref=A1", "Join me on Smartly:", "Try Smartly");
    expect(links.whatsapp).toBe("https://wa.me/?text=Join%20me%20on%20Smartly%3A%20https%3A%2F%2Fx.test%2Fregister%3Fref%3DA1");
    expect(links.messenger).toBe("fb-messenger://share/?link=https%3A%2F%2Fx.test%2Fregister%3Fref%3DA1");
    expect(links.email).toContain("mailto:?subject=Try%20Smartly&body=");
  });
});

describe("the words", () => {
  it("words every status, tab and note in Bangla, in English without the context", () => {
    const keys = [...FRIEND_TABS.map((tab) => tab.label), ...Object.values(FRIEND_STATUS).flatMap((s) => [s.label, s.short]), ...Object.values(PAYOUT_STATUS).map((s) => s.label), ...Object.values(CANCEL_NOTES)];
    for (const key of keys) expect(bnDictionary[key], key).toBeTruthy();
    expect(translate("en", "Available@@referral")).toBe("Available");
    expect(translate("en", "Requested@@payout")).toBe("Requested");
  });

  // The keys are one namespace and referrals is spread after savings, so a
  // plain word here would reword the Savings pages too.
  it("leaves the plain words the Savings pages use to them", () => {
    for (const word of ["Available", "Paid out", "Withdrawn", "Withdraw"]) expect(Object.hasOwn(referralsDictionary, word), word).toBe(false);
    expect(translate("bn", "Withdrawn")).toBe(savingsGoalsDictionary.Withdrawn);
  });

  // A Bangla sentence that lost {count} or {date} would show the wrong
  // figure, or none.
  it("keeps every {placeholder} of the English in its Bangla", () => {
    const placeholders = (text: string) => [...text.matchAll(/(?<!\{)\{(\w+)\}(?!\})/g)].map((match) => match[1]).sort();
    for (const [english, bangla] of Object.entries(referralsDictionary)) expect(placeholders(bangla), english).toEqual(placeholders(english));
  });

  it("words the API's refusals", () => {
    for (const message of [
      "No available balance to withdraw.",
      "Pick a cash, bank, mobile banking or savings wallet",
      "That wallet was not found in this workspace",
      "Enter the Rocket number: 11 digits starting with 01 (12 with the last digit)",
      "The routing number has 9 digits",
      "This code has expired. Start again to get a new one.",
      "Codes cannot be sent right now because email is not set up. Please contact support.",
      "Choose where the money should go",
    ]) {
      expect(bnDictionary[message], message).toBeTruthy();
    }
  });
});
