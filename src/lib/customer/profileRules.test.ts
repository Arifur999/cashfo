import { describe, expect, it } from "vitest";
import { nameProblem, phoneProblem, saveBarText } from "./profileRules";

describe("nameProblem", () => {
  it("takes names in English and Bangla", () => {
    expect(nameProblem("Khaled Mahmud")).toBeNull();
    expect(nameProblem("নুসরাত জাহান")).toBeNull();
    expect(nameProblem("Md. Abdul-Karim O'Neil")).toBeNull();
  });

  it("says what is wrong", () => {
    expect(nameProblem("  ")).toBe("Type your name.");
    expect(nameProblem("K")).toBe("Use at least 2 letters.");
    expect(nameProblem("K".repeat(41))).toBe("Keep it under 40 letters.");
    expect(nameProblem("Khaled 2")).toBe("Use letters only, no numbers or symbols.");
    expect(nameProblem("Khaled!")).toBe("Use letters only, no numbers or symbols.");
  });
});

describe("phoneProblem", () => {
  it("lets the optional phone be empty, or ten digits of a mobile", () => {
    expect(phoneProblem("")).toBeNull();
    expect(phoneProblem("1711-482915")).toBeNull();
    expect(phoneProblem("১৭১১-৪৮২৯১৫")).toBeNull();
  });

  it("says what is wrong", () => {
    expect(phoneProblem("1711-48291")).toBe("Type all 10 digits after +880, like 1711-482915.");
    expect(phoneProblem("1211-482915")).toBe("Use a Bangladesh mobile number that starts with 13 to 19.");
  });
});

describe("saveBarText", () => {
  const none = { name: false, phone: false, phoneRemoved: false, address: false };
  const calm = { invalid: false, saving: false, justSaved: false };

  it("puts saving and a problem first", () => {
    expect(saveBarText({ ...none, name: true }, { ...calm, saving: true })).toBe("Saving…");
    expect(saveBarText({ ...none, name: true }, { ...calm, invalid: true })).toBe("Fix the field marked in red first.");
  });

  it("says what changed", () => {
    expect(saveBarText({ ...none, name: true, phone: true }, calm)).toBe("You changed your name and phone number.");
    expect(saveBarText({ ...none, phone: true, phoneRemoved: true }, calm)).toBe("You removed your phone number.");
    expect(saveBarText({ ...none, address: true }, calm)).toBe("You changed your address.");
    expect(saveBarText({ ...none, address: true, name: true }, calm)).toBe("You changed {count} things.");
  });

  it("is calm with nothing to save", () => {
    expect(saveBarText(none, calm)).toBe("No changes yet.");
    expect(saveBarText(none, { ...calm, justSaved: true })).toBe("All changes saved.");
  });
});
