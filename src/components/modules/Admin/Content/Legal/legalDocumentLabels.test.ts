import { describe, expect, it } from "vitest";
import { LEGAL_ROUTES } from "@/lib/authUtils";
import { LEGAL_DOC_TYPES } from "@/types/legalDocument.types";
import { LEGAL_DOC_LABELS, LEGAL_DOC_ROUTES, legalEditorHeadingId } from "./legalDocumentLabels";

describe("legal document labels", () => {
  it("names and links every document to a page people can open", () => {
    for (const type of LEGAL_DOC_TYPES) {
      expect(LEGAL_DOC_LABELS[type], type).toBeTruthy();
      expect(LEGAL_ROUTES, type).toContain(LEGAL_DOC_ROUTES[type]);
    }
  });

  it("gives each editor heading its own id", () => {
    const ids = LEGAL_DOC_TYPES.map(legalEditorHeadingId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(legalEditorHeadingId("REFUND_POLICY")).toBe("legal-editor-refund_policy");
  });
});
