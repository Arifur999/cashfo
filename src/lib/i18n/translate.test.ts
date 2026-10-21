import { describe, expect, it } from "vitest";
import { sharedDictionary } from "./dictionary/shared";
import { translate } from "./translate";

describe("translate", () => {
  it("prefers the admin-edited Bangla over the built-in dictionary", () => {
    expect(translate("bn", "Cancel")).not.toBe("Cancel");
    expect(translate("bn", "Cancel", { Cancel: "বাদ দিন" })).toBe("বাদ দিন");
  });

  it("falls back to the dictionary, then to the English text", () => {
    expect(translate("bn", "Cancel", { Save: "সংরক্ষণ" })).toBe(translate("bn", "Cancel"));
    expect(translate("bn", "Not in any dictionary", {})).toBe("Not in any dictionary");
  });

  it("leaves English alone", () => {
    expect(translate("en", "Cancel", { Cancel: "বাদ দিন" })).toBe("Cancel");
  });

  it("tells two meanings of one word apart by their context", () => {
    expect(translate("en", "On@@record")).toBe("On");
    expect(translate("bn", "On@@record")).not.toBe(translate("bn", "On"));
    expect(translate("bn", "Nothing@@unknown")).toBe("Nothing");
  });

  it("falls back from a word in context to the plain word", () => {
    expect(translate("bn", "Cancel@@nothing-special")).toBe(translate("bn", "Cancel"));
    expect(translate("bn", "Open@@status")).not.toBe(translate("bn", "Open"));
    expect(translate("en", "Open@@status")).toBe("Open");
  });

  it("lets the admin panel keep its own wording where the app words it differently", () => {
    // The admin dictionaries word "Status" অবস্থা; the customer app স্ট্যাটাস.
    expect(translate("bn", "Status", undefined, "admin")).not.toBe(translate("bn", "Status"));
    expect(translate("bn", "Status", undefined, "admin")).toBe("অবস্থা");
  });

  // Words two areas worded differently, settled in shared.ts, which spreads
  // last: every customer page reads them one way.
  it("reads a shared word as shared.ts words it", () => {
    for (const key of ["Unlock", "Newest first", "Preview", "Save changes", "Show fewer", "Saved@@status"]) {
      expect(translate("bn", key), key).toBe(sharedDictionary[key]);
    }
    // A save confirmation, not the money put by in Savings.
    expect(translate("bn", "Saved@@status")).not.toBe(translate("bn", "Saved"));
  });

  it("never resolves an inherited property", () => {
    expect(translate("bn", "constructor", {})).toBe("constructor");
    expect(translate("bn", "toString", JSON.parse('{"__proto__": "x"}'))).toBe("toString");
  });
});
