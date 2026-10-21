import { describe, expect, it } from "vitest";
import { insertAtCaret, sameTemplateText, smsLength } from "./templateText";

describe("insertAtCaret", () => {
  it("puts the placeholder at the caret, spaced from the word before it", () => {
    expect(insertAtCaret("Hi", 2, 2, "{{userName}}")).toEqual({ text: "Hi {{userName}}", caret: 15 });
    expect(insertAtCaret("Dear ,", 5, 5, "{{userName}}")).toEqual({ text: "Dear {{userName}},", caret: 17 });
    expect(insertAtCaret("", 0, 0, "{{code}}")).toEqual({ text: "{{code}}", caret: 8 });
  });

  it("replaces a selection", () => {
    expect(insertAtCaret("Pay NAME now", 4, 8, "{{amount}}")).toEqual({ text: "Pay {{amount}} now", caret: 14 });
  });

  it("keeps a caret it was given inside the text", () => {
    expect(insertAtCaret("abc", 10, 12, "X").text).toBe("abc X");
    expect(insertAtCaret("abc", -3, -1, "X").text).toBe("Xabc");
  });
});

describe("sameTemplateText", () => {
  const values = { subjectEn: "Welcome", subjectBn: "স্বাগতম", bodyEn: "Hi {{userName}}", bodyBn: "হাই" };

  it("ignores the spaces the API trims", () => {
    expect(sameTemplateText(values, { ...values, bodyEn: "Hi {{userName}}  " })).toBe(true);
    expect(sameTemplateText(values, { ...values, bodyBn: "নমস্কার" })).toBe(false);
  });
});

describe("smsLength", () => {
  it("counts plain text as GSM, 160 to one message, then 153 a part", () => {
    expect(smsLength("Your code is 1234")).toEqual({ characters: 17, parts: 1, unicode: false });
    expect(smsLength("a".repeat(160)).parts).toBe(1);
    expect(smsLength("a".repeat(161)).parts).toBe(2);
    expect(smsLength("a".repeat(307)).parts).toBe(3);
  });

  it("counts the extension characters twice", () => {
    expect(smsLength("[ok]").characters).toBe(6);
  });

  it("sends Bangla, or a taka sign, as Unicode: 70, then 67 a part", () => {
    expect(smsLength("৳ 299 paid").unicode).toBe(true);
    expect(smsLength("আপনার পেমেন্ট হয়েছে").parts).toBe(1);
    expect(smsLength("ক".repeat(71)).parts).toBe(2);
    expect(smsLength("ক".repeat(135)).parts).toBe(3);
  });

  it("is nothing for an empty text", () => {
    expect(smsLength("")).toEqual({ characters: 0, parts: 0, unicode: false });
  });
});
