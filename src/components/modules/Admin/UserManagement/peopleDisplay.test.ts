import { describe, expect, it } from "vitest";
import { bnAdminScopeDictionary } from "@/lib/i18n/dictionary";
import { adminPeopleDictionary } from "@/lib/i18n/dictionary/admin-people";
import { type FillValues, fillText } from "@/lib/i18n/fill";
import { inEnglish } from "@/lib/i18n/message";
import { translate } from "@/lib/i18n/translate";
import { BACK_PARAM, countPhrase, daysSince, daysUsedLabel, listBackHref, moreWorkspacesLabel, PERSONAL_WORKSPACE_NAME, withListState, workspaceLabel } from "./peopleDisplay";

// The admin panel's Bangla, as the Translate a Bangla reader's pages get.
const bangla = (key: string, values?: FillValues) => {
  const text = translate("bn", key, undefined, "admin");
  return values ? fillText(text, values) : text;
};

describe("workspaceLabel", () => {
  it("shows the stored personal name in the reader's language", () => {
    expect(workspaceLabel(PERSONAL_WORKSPACE_NAME, inEnglish)).toBe("Personal");
    expect(workspaceLabel(PERSONAL_WORKSPACE_NAME, inEnglish, "Personal workspace")).toBe("Personal workspace");
    expect(workspaceLabel(PERSONAL_WORKSPACE_NAME, bangla)).toBe("ব্যক্তিগত");
    expect(workspaceLabel(PERSONAL_WORKSPACE_NAME, bangla, "Personal workspace")).toBe("ব্যক্তিগত ওয়ার্কস্পেস");
  });

  it("keeps any other name as written", () => {
    expect(workspaceLabel("Rahim Traders", bangla)).toBe("Rahim Traders");
    expect(workspaceLabel("personal", bangla)).toBe("personal");
  });

  it("has nothing to show without a name", () => {
    expect(workspaceLabel(null, inEnglish)).toBeNull();
    expect(workspaceLabel(undefined, inEnglish)).toBeNull();
    expect(workspaceLabel("", inEnglish)).toBeNull();
  });
});

describe("countPhrase", () => {
  it("picks the English form by count", () => {
    expect(countPhrase(inEnglish, "en", 1, "{count} day", "{count} days")).toBe("1 day");
    expect(countPhrase(inEnglish, "en", 0, "{count} day", "{count} days")).toBe("0 days");
    expect(countPhrase(inEnglish, "en", 1234, "{count} day", "{count} days")).toBe("1,234 days");
  });

  // The pager under the same card prints ১–১০, so the counts above it must too.
  it("writes the count in Bangla digits for a Bangla reader", () => {
    expect(countPhrase(bangla, "bn", 12, "{count} day", "{count} days")).toBe("১২ দিন");
    expect(countPhrase(bangla, "bn", 1234, "{count} more workspace", "{count} more workspaces")).toBe("আরও ১,২৩৪টি ওয়ার্কস্পেস");
  });
});

describe("daysSince", () => {
  const now = Date.parse("2026-10-21T12:00:00.000Z");

  it("counts whole days, like the backend's daysUsing", () => {
    expect(daysSince("2026-10-21T08:00:00.000Z", now)).toBe(0);
    expect(daysSince("2026-10-20T11:59:00.000Z", now)).toBe(1);
    expect(daysSince("2026-10-11T12:00:00.000Z", now)).toBe(10);
  });

  it("never goes below 0, and reads a broken date as today", () => {
    expect(daysSince("2026-10-25T12:00:00.000Z", now)).toBe(0);
    expect(daysSince("not a date", now)).toBe(0);
  });
});

describe("daysUsedLabel", () => {
  it("says Joined today on the first day instead of 0 days", () => {
    expect(daysUsedLabel(0, inEnglish, "en")).toBe("Joined today");
    expect(daysUsedLabel(0, bangla, "bn")).toBe("আজ যোগ দিয়েছেন");
  });

  it("counts the days after that", () => {
    expect(daysUsedLabel(1, inEnglish, "en")).toBe("1 day");
    expect(daysUsedLabel(9, inEnglish, "en")).toBe("9 days");
    expect(daysUsedLabel(9, bangla, "bn")).toBe("৯ দিন");
  });
});

describe("moreWorkspacesLabel", () => {
  it("words the chip for one and for several", () => {
    expect(moreWorkspacesLabel(1, inEnglish, "en")).toBe("1 more workspace");
    expect(moreWorkspacesLabel(2, inEnglish, "en")).toBe("2 more workspaces");
    expect(moreWorkspacesLabel(2, bangla, "bn")).toBe("আরও ২টি ওয়ার্কস্পেস");
  });
});

describe("withListState", () => {
  it("leaves the link alone when the list has no query", () => {
    expect(withListState("/admin/users/u-1", "")).toBe("/admin/users/u-1");
    expect(withListState("/admin/users/u-1?from=owners", "")).toBe("/admin/users/u-1?from=owners");
  });

  it("carries the list's query as one encoded param", () => {
    expect(withListState("/admin/users/u-1", "status=SUSPENDED&page=3")).toBe(`/admin/users/u-1?${BACK_PARAM}=status%3DSUSPENDED%26page%3D3`);
  });

  it("keeps a param the link already has", () => {
    expect(withListState("/admin/users/u-1?from=workspaces", "page=2")).toBe("/admin/users/u-1?from=workspaces&back=page%3D2");
  });
});

describe("listBackHref", () => {
  const keys = ["search", "status", "planId", "page", "limit"];

  it("is the plain list without a ?back=", () => {
    expect(listBackHref("/admin/users", undefined, keys)).toBe("/admin/users");
    expect(listBackHref("/admin/users", "", keys)).toBe("/admin/users");
  });

  it("restores the list's filters and page", () => {
    expect(listBackHref("/admin/users", "status=SUSPENDED&planId=p-1&page=3", keys)).toBe("/admin/users?status=SUSPENDED&planId=p-1&page=3");
  });

  it("round-trips what withListState carried", () => {
    const link = withListState("/admin/users/u-1", "search=rahim+khan&page=2");
    const back = new URLSearchParams(link.split("?")[1]).get(BACK_PARAM) ?? undefined;
    expect(listBackHref("/admin/users", back, keys)).toBe("/admin/users?search=rahim+khan&page=2");
  });

  it("drops what isn't the list's own, and empty values", () => {
    expect(listBackHref("/admin/users", "status=ACTIVE&from=owners&back=x&utm_source=mail&search=", keys)).toBe("/admin/users?status=ACTIVE");
  });

  // It is read as a query, never as a URL, so it can't point off the list.
  it("can't lead anywhere but the list", () => {
    expect(listBackHref("/admin/users", "https://evil.example/steal", keys)).toBe("/admin/users");
    expect(listBackHref("/admin/users", "//evil.example?page=2", keys)).toBe("/admin/users");
    expect(listBackHref("/admin/workspaces", "page=2&status=ACTIVE", ["page", "limit"])).toBe("/admin/workspaces?page=2");
  });
});

// Every sentence the people pages added in this pass reads in Bangla; a
// missing one would leave English in the middle of a Bangla page.
describe("people pages' Bangla", () => {
  const KEYS = [
    "Joined today",
    "{count} more workspace",
    "{count} more workspaces",
    "Personal",
    "Personal workspace",
    "Using for {days}",
    "{name} and {count} more",
    "Changes only when they sign in",
    "Last sign-in",
    "Last sign-in, newest first",
    "Joined@@date",
    "Suspend@@action",
    "Turn {name}'s account back on?",
    "Account turned back on",
    "Account suspended",
    "They're signed out on every device straight away and can't sign in until you turn the account back on.",
    "Couldn't load the users. Try again in a moment.",
    "Couldn't load the owners. Try again in a moment.",
    "Couldn't load workspaces",
    "Try again in a moment.",
    "Couldn't load the plans. Reload the page and try again.",
    "There's no other active plan to move them to.",
    "Explain why (at least 5 characters)",
    "Besides each person's own personal workspace",
    "Add-on = extra business workspaces × the plan's monthly price × 50% (a yearly plan counts as a twelfth of its price). Group workspaces and the Free plan add nothing. This is an estimate; nobody is charged for it yet.",
    "Every owner's account. If an owner asks for a fresh start, reset their personal workspace's money data here. Their login stays as it is.",
    "Reset {name}'s personal workspace?",
    "This permanently deletes every account, transaction, contact, savings goal, asset, asset type, budget category, income goal and the monthly budget in {name}'s ({email}) personal workspace, then puts back the starting accounts. Their login and password vault stay as they are.",
    "Their other workspace is not touched.",
    "Their other {count} workspaces are not touched.",
    "Type their email to confirm:",
    "Matches their email",
    "This person doesn't exist or their account was removed",
  ];

  it("has every key in the admin dictionary", () => {
    for (const key of KEYS) {
      expect(bnAdminScopeDictionary[key], key).toBeTruthy();
    }
  });

  // A Bangla sentence that lost {count} or {email} would show the wrong
  // figure, or none.
  it("keeps every {placeholder} of the English in this area's Bangla", () => {
    const placeholders = (text: string) => [...text.matchAll(/(?<!\{)\{(\w+)\}(?!\})/g)].map((match) => match[1]).sort();
    for (const [english, bnText] of Object.entries(adminPeopleDictionary)) {
      expect(placeholders(bnText), english).toEqual(placeholders(english));
    }
  });

  // The admin panel reads this area's wording over every other's.
  it("is the Bangla the admin panel shows", () => {
    for (const [english, bnText] of Object.entries(adminPeopleDictionary)) {
      expect(bnAdminScopeDictionary[english], english).toBe(bnText);
    }
  });

  // A word on a button and the same word as a status read differently.
  it("words the Suspend button as an action, apart from the Suspended status", () => {
    expect(translate("bn", "Suspend@@action", undefined, "admin")).not.toBe(translate("bn", "Suspended@@status", undefined, "admin"));
    expect(translate("en", "Suspend@@action")).toBe("Suspend");
    expect(translate("en", "Joined@@date")).toBe("Joined");
  });
});
