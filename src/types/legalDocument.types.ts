export const LEGAL_DOC_TYPES = ["TERMS_OF_SERVICE", "PRIVACY_POLICY", "REFUND_POLICY", "COOKIE_POLICY", "COMMUNITY_RULES", "FAQ"] as const;
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
  // From the list (newer API): when and by whom the live version went out,
  // and the one draft being written, if any.
  publishedAt?: string;
  publishedBy?: { id: string; name: string } | null;
  draft?: { id: string; version: number; updatedAt: string } | null;
}

// One version of a page: every one published, and the open draft.
export interface ILegalVersion {
  id: string;
  type: LegalDocType;
  version: number;
  status: "DRAFT" | "PUBLISHED";
  contentEn: string;
  contentBn: string | null;
  createdBy: { id: string; name: string } | null;
  publishedBy: { id: string; name: string } | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IUpdateLegalDocumentPayload {
  contentEn: string;
  // null clears the Bangla text (the app falls back to English).
  contentBn: string | null;
}
