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
