import { describe, expect, it } from "vitest";
import { LEGAL_ROUTES } from "@/lib/authUtils";
import { LEGAL_DOC_TYPES } from "@/types/legalDocument.types";
import { banglaState, LEGAL_DOC_LABELS, LEGAL_DOC_ROUTES, legalEditorHeadingId, sectionCount } from "./legalDocumentLabels";

describe("legal document labels", () => {
  it("names every document, and links the ones with a page to a page people can open", () => {
    for (const type of LEGAL_DOC_TYPES) {
      expect(LEGAL_DOC_LABELS[type], type).toBeTruthy();
      const route = LEGAL_DOC_ROUTES[type];
      if (route) expect(LEGAL_ROUTES, type).toContain(route);
    }
  });

  it("gives each editor heading its own id", () => {
    const ids = LEGAL_DOC_TYPES.map(legalEditorHeadingId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(legalEditorHeadingId("REFUND_POLICY")).toBe("legal-editor-refund_policy");
  });
});

describe("banglaState", () => {
  const en = "Intro\n\n## What we collect\nText\n\n## Who sees it\nText";
  it("says the Bangla is empty, behind by sections, or level", () => {
    expect(banglaState(en, "")).toEqual({ kind: "empty" });
    expect(banglaState(en, "## কী রাখি\nলেখা")).toEqual({ kind: "behind", sections: 1 });
    expect(banglaState(en, "## এক\n\n## দুই")).toEqual({ kind: "level" });
    expect(sectionCount("# A\n### B\nnot ## C")).toBe(2);
  });
});
