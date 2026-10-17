import { describe, expect, it } from "vitest";
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

  it("never resolves an inherited property", () => {
    expect(translate("bn", "constructor", {})).toBe("constructor");
    expect(translate("bn", "toString", JSON.parse('{"__proto__": "x"}'))).toBe("toString");
  });
});
