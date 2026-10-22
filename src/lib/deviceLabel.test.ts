import { describe, expect, it } from "vitest";
import { deviceLabelText } from "./deviceLabel";
import { fillText } from "./i18n/fill";
import { translate } from "./i18n/translate";

const bn = (key: string, values?: Record<string, string | number>) => fillText(translate("bn", key), values ?? {});
const en = (key: string, values?: Record<string, string | number>) => fillText(key, values ?? {});

describe("deviceLabelText", () => {
  it("words the backend's device label in the reader's language", () => {
    expect(deviceLabelText("Chrome on Windows", en)).toBe("Chrome on Windows");
    expect(deviceLabelText("Chrome on Windows", bn)).toBe("Windows-এ Chrome");
    expect(deviceLabelText("Chrome on Linux (Mobile)", bn)).toBe("Linux-এ Chrome (মোবাইল)");
    expect(deviceLabelText("Unknown browser on Unknown OS", bn)).toBe("অজানা সিস্টেম-এ অজানা ব্রাউজার");
    expect(deviceLabelText("Unknown device", bn)).toBe("অজানা ডিভাইস");
  });
});
