export const LEGAL_DOC_TYPES = ["TERMS_OF_SERVICE", "PRIVACY_POLICY", "REFUND_POLICY", "FAQ"] as const;
export type LegalDocType = (typeof LEGAL_DOC_TYPES)[number];

export interface ILegalDocument {
  id: string;
  type: LegalDocType;
  contentEn: string;
  contentBn: string | null;
  // Bumped by the API on every save.
  version: number;
  updatedAt: string;
  updatedBy: string | null;
}

export interface IUpdateLegalDocumentPayload {
  contentEn: string;
  // null clears the Bangla text (the app falls back to English).
  contentBn: string | null;
}
