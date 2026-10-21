import { describe, expect, it } from "vitest";
import { backupAgeTone } from "./backupAge";

describe("backupAgeTone", () => {
  it("stays calm for two days", () => {
    expect(backupAgeTone(0)).toBe("ok");
    expect(backupAgeTone(2)).toBe("ok");
  });

  it("warns after two days", () => {
    expect(backupAgeTone(3)).toBe("warning");
    expect(backupAgeTone(7)).toBe("warning");
  });

  it("alarms after a week, or when there has never been a good backup", () => {
    expect(backupAgeTone(8)).toBe("danger");
    expect(backupAgeTone(null)).toBe("danger");
  });
});
