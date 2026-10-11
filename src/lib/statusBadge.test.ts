import { describe, expect, it } from "vitest";
import { enumOptions, getStatusTone, humanizeEnum } from "./statusBadge";

describe("humanizeEnum", () => {
  it("turns SCREAMING_SNAKE into a sentence", () => {
    expect(humanizeEnum("WAITING_ON_USER")).toBe("Waiting on user");
    expect(humanizeEnum("ACTIVE")).toBe("Active");
  });

  it("uses the overrides for words a plain rule would get wrong", () => {
    expect(humanizeEnum("SMS")).toBe("SMS");
    expect(humanizeEnum("IN_APP_PUSH")).toBe("In-app push");
    expect(humanizeEnum("BKASH")).toBe("bKash");
    expect(humanizeEnum("FAQ")).toBe("FAQ");
  });
});

describe("getStatusTone", () => {
  it("maps known statuses to their tone", () => {
    expect(getStatusTone("SUCCESS")).toBe("success");
    expect(getStatusTone("FAILED")).toBe("danger");
    expect(getStatusTone("URGENT")).toBe("danger");
    expect(getStatusTone("SCHEDULED")).toBe("info");
  });

  it("falls back to neutral for anything unknown", () => {
    expect(getStatusTone("SOMETHING_NEW")).toBe("neutral");
  });
});

describe("enumOptions", () => {
  it("builds value/label pairs in the given order", () => {
    expect(enumOptions(["OPEN", "IN_PROGRESS"] as const)).toEqual([
      { value: "OPEN", label: "Open" },
      { value: "IN_PROGRESS", label: "In progress" },
    ]);
  });
});
