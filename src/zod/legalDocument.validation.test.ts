import { describe, expect, it } from "vitest";
import { LEGAL_DOCUMENT_MAX_LENGTH, legalDocumentServerZodSchema } from "./legalDocument.validation";

describe("legalDocumentServerZodSchema", () => {
  it("trims both texts and stores an empty Bangla text as null", () => {
    const result = legalDocumentServerZodSchema.safeParse({ contentEn: "  Terms apply.\n\n", contentBn: "   " });

    expect(result.success && result.data).toEqual({ contentEn: "Terms apply.", contentBn: null });
  });

  it("keeps a Bangla text", () => {
    const result = legalDocumentServerZodSchema.safeParse({ contentEn: "Terms apply.", contentBn: "শর্ত প্রযোজ্য।" });
    expect(result.success && result.data.contentBn).toBe("শর্ত প্রযোজ্য।");
  });

  it("refuses to save an empty English text", () => {
    expect(legalDocumentServerZodSchema.safeParse({ contentEn: " ", contentBn: "শর্ত" }).success).toBe(false);
  });

  it("caps the length", () => {
    const tooLong = "a".repeat(LEGAL_DOCUMENT_MAX_LENGTH + 1);
    expect(legalDocumentServerZodSchema.safeParse({ contentEn: tooLong, contentBn: "" }).success).toBe(false);
  });
});
