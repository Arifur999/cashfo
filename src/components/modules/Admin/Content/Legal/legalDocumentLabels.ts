import type { ILegalDocument, LegalDocType } from "@/types/legalDocument.types";
import type { ILegalDocumentFormValues } from "@/zod/legalDocument.validation";

export const LEGAL_DOC_LABELS: Record<LegalDocType, string> = {
  TERMS_OF_SERVICE: "Terms of Service",
  PRIVACY_POLICY: "Privacy Policy",
  REFUND_POLICY: "Refund Policy",
  FAQ: "FAQ",
};

// Where people read each document (the (legal) pages, LEGAL_ROUTES).
export const LEGAL_DOC_ROUTES: Record<LegalDocType, string> = {
  TERMS_OF_SERVICE: "/terms",
  PRIVACY_POLICY: "/privacy",
  REFUND_POLICY: "/refund-policy",
  FAQ: "/faq",
};

export const toLegalDocumentFormValues = (document: ILegalDocument): ILegalDocumentFormValues => ({
  contentEn: document.contentEn,
  contentBn: document.contentBn ?? "",
});

// The id of a document's editor heading, so the list can bring it into view.
export const legalEditorHeadingId = (type: LegalDocType) => `legal-editor-${type.toLowerCase()}`;

// How many "## " sections a text has (a heading line, as the public page
// reads them). On the FAQ each section is a question.
export const sectionCount = (text: string | null | undefined) => (text ?? "").split(/\r?\n/).filter((line) => /^#{1,3}\s+\S/.test(line.trim())).length;

// Where the Bangla stands against the English: empty, some sections
// behind, or level. Compared by sections, since the words themselves differ.
export type BanglaState = { kind: "empty" } | { kind: "behind"; sections: number } | { kind: "level" };

export const banglaState = (contentEn: string, contentBn: string | null | undefined): BanglaState => {
  if (!contentBn?.trim()) return { kind: "empty" };
  const behind = sectionCount(contentEn) - sectionCount(contentBn);
  return behind > 0 ? { kind: "behind", sections: behind } : { kind: "level" };
};
