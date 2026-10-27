import { describe, expect, it } from "vitest";
import { bnAdminScopeDictionary } from "@/lib/i18n/dictionary";
import { adminPeopleDictionary } from "@/lib/i18n/dictionary/admin-people";
import { type FillValues, fillText } from "@/lib/i18n/fill";
import { inEnglish } from "@/lib/i18n/message";
import { translate } from "@/lib/i18n/translate";
import {
  daysSince,
  isPhoneDevice,
  ownerHistoryLine,
  ownerTabOf,
  walletKindsLabel,
  workspacePlanLabel,
  daysUsedLabel,
  isPersonalWorkspace,
  moreWorkspacesLabel,
  ownWorkspaceLabel,
  PERSONAL_WORKSPACE_NAME,
  workspaceLabel,
  workspaceNamesLabel,
} from "./peopleDisplay";

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

// The API says what kind each workspace is; the stored name "Personal" is
// only the rule for a response that doesn't.
describe("isPersonalWorkspace", () => {
  it("goes by the kind when the response has it", () => {
    expect(isPersonalWorkspace("Home", "PERSONAL")).toBe(true);
    expect(isPersonalWorkspace(PERSONAL_WORKSPACE_NAME, "BUSINESS")).toBe(false);
    expect(isPersonalWorkspace(PERSONAL_WORKSPACE_NAME, "GROUP")).toBe(false);
  });

  it("falls back to the stored name without a kind", () => {
    expect(isPersonalWorkspace(PERSONAL_WORKSPACE_NAME)).toBe(true);
    expect(isPersonalWorkspace(PERSONAL_WORKSPACE_NAME, null)).toBe(true);
    expect(isPersonalWorkspace("Rahim Traders", undefined)).toBe(false);
  });
});

describe("ownWorkspaceLabel", () => {
  it("names a renamed personal workspace by its kind", () => {
    expect(ownWorkspaceLabel({ businessName: "Home", businessType: "PERSONAL" }, inEnglish, "Personal workspace")).toBe("Personal workspace");
    expect(ownWorkspaceLabel({ businessName: "Home", businessType: "PERSONAL" }, bangla)).toBe("ব্যক্তিগত");
  });

  it("keeps a business called Personal as written", () => {
    expect(ownWorkspaceLabel({ businessName: PERSONAL_WORKSPACE_NAME, businessType: "BUSINESS" }, bangla)).toBe(PERSONAL_WORKSPACE_NAME);
  });

  it("reads an older row by its name, and a row without a workspace as none", () => {
    expect(ownWorkspaceLabel({ businessName: PERSONAL_WORKSPACE_NAME }, bangla, "Personal workspace")).toBe("ব্যক্তিগত ওয়ার্কস্পেস");
    expect(ownWorkspaceLabel({ businessName: null, businessType: null }, inEnglish)).toBeNull();
  });
});

describe("workspaceNamesLabel", () => {
  it("labels each workspace by its kind when the row lists them", () => {
    const row = {
      workspaceNames: ["Home", "Personal", "Mess"],
      workspaces: [
        { name: "Home", type: "PERSONAL" as const },
        { name: "Personal", type: "BUSINESS" as const },
        { name: "Mess", type: "GROUP" as const },
      ],
    };
    expect(workspaceNamesLabel(row, inEnglish)).toBe("Personal, Personal, Mess");
    expect(workspaceNamesLabel(row, bangla)).toBe("ব্যক্তিগত, Personal, Mess");
  });

  it("falls back to the plain names, and skips an empty one", () => {
    expect(workspaceNamesLabel({ workspaceNames: ["Personal", "Rahim Traders", ""] }, bangla)).toBe("ব্যক্তিগত, Rahim Traders");
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

  // The pager under the same card prints ১–১০, so the counts above it must too.
  it("writes the count in the reader's digits", () => {
    expect(moreWorkspacesLabel(1234, inEnglish, "en")).toBe("1,234 more workspaces");
    expect(moreWorkspacesLabel(1234, bangla, "bn")).toBe("আরও ১,২৩৪টি ওয়ার্কস্পেস");
    expect(daysUsedLabel(1234, inEnglish, "en")).toBe("1,234 days");
    expect(daysUsedLabel(12, bangla, "bn")).toBe("১২ দিন");
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
    "Couldn't load the users",
    "Couldn't load the owners",
    "Search people or workspaces",
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

describe("a person's page", () => {
  it("says how their workspaces sit against the plan", () => {
    expect(workspacePlanLabel(2, 1, inEnglish, "en")).toBe("1 more than the plan includes");
    expect(workspacePlanLabel(1, 3, inEnglish, "en")).toBe("Within the plan");
    expect(workspacePlanLabel(4, null, inEnglish, "en")).toBe("The plan has no limit");
  });

  it("names their wallets by kind", () => {
    expect(walletKindsLabel({ cash: 1, bank: 2, mfs: 1, savings: 0 }, inEnglish, "en")).toBe("Cash, 2 banks, 1 mobile wallet");
    expect(walletKindsLabel({ cash: 0, bank: 0, mfs: 0, savings: 0 }, inEnglish, "en")).toBe("No wallets yet");
  });

  it("words what admins did, and leaves unknown actions to the audit labels", () => {
    expect(ownerHistoryLine("USER_SUSPENDED")).toEqual({ text: "suspended the account", tone: "expense" });
    expect(ownerHistoryLine("SOMETHING_NEW")).toBeNull();
  });

  it("reads ?tab=, Overview when absent or unknown", () => {
    expect(ownerTabOf("billing")).toBe("billing");
    expect(ownerTabOf(["notes", "billing"])).toBe("notes");
    expect(ownerTabOf("constructor")).toBe("overview");
    expect(ownerTabOf(undefined)).toBe("overview");
  });

  it("tells a phone from a computer by its label", () => {
    expect(isPhoneDevice("Chrome on Android")).toBe(true);
    expect(isPhoneDevice("Chrome on Windows")).toBe(false);
    expect(isPhoneDevice(null)).toBe(false);
  });
});
