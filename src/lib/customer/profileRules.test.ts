import { describe, expect, it } from "vitest";
import { birthDateProblem, nameProblem, phoneProblem, profileCompleteness, saveBarText, secondPhoneProblem } from "./profileRules";

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
  const calm = { invalid: false, saving: false, justSaved: false };

  it("puts saving and a problem first", () => {
    expect(saveBarText(["name"], { ...calm, saving: true })).toBe("Saving…");
    expect(saveBarText(["name"], { ...calm, invalid: true })).toBe("Fix the field marked in red first.");
  });

  it("says what changed", () => {
    expect(saveBarText(["name"], calm)).toBe("You changed your name.");
    expect(saveBarText(["phone"], { ...calm, phoneRemoved: true })).toBe("You removed your phone number.");
    expect(saveBarText(["phone"], calm)).toBe("You changed your phone number.");
    expect(saveBarText(["name", "district"], calm)).toBe("Not saved yet: {list}.");
  });

  it("is calm with nothing to save", () => {
    expect(saveBarText([], calm)).toBe("No changes yet.");
    expect(saveBarText([], { ...calm, justSaved: true })).toBe("All changes saved.");
  });
});

describe("the new details", () => {
  it("takes a date of birth from 13 years back to 1920", () => {
    expect(birthDateProblem("", "2026-11-08")).toBeNull();
    expect(birthDateProblem("2013-11-08", "2026-11-08")).toBeNull();
    expect(birthDateProblem("2013-11-09", "2026-11-08")).toBe("You need to be at least 13 to use Smartly.");
    expect(birthDateProblem("2026-12-01", "2026-11-08")).toBe("That date is in the future.");
    expect(birthDateProblem("1919-05-01", "2026-11-08")).toBe("Check the year.");
  });

  it("wants a second number unlike the first", () => {
    expect(secondPhoneProblem("1811-000000", "1711-482915")).toBeNull();
    expect(secondPhoneProblem("1711482915", "1711-482915")).toBe("This is the same as your main number.");
    expect(secondPhoneProblem("1211-000000", "")).toBe("Use a Bangladesh mobile number that starts with 13 to 19.");
  });

  it("counts how complete the profile is", () => {
    const have = { photo: true, name: true, dateOfBirth: false, gender: false, occupation: false, district: true, address: false, phone: true, email: false };
    const { percent, missing } = profileCompleteness(have);
    expect(percent).toBe(44);
    expect(missing.map((check) => check.key)).toEqual(["dateOfBirth", "gender", "occupation", "address", "email"]);
  });
});
