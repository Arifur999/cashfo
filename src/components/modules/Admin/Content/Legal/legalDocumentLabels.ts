import type { ILegalDocument, LegalDocType } from "@/types/legalDocument.types";
import type { ILegalDocumentFormValues } from "@/zod/legalDocument.validation";

export const LEGAL_DOC_LABELS: Record<LegalDocType, string> = {
  TERMS_OF_SERVICE: "Terms of Service",
  PRIVACY_POLICY: "Privacy Policy",
  REFUND_POLICY: "Refund Policy",
  FAQ: "FAQ",
};

export const toLegalDocumentFormValues = (document: ILegalDocument): ILegalDocumentFormValues => ({
  contentEn: document.contentEn,
  contentBn: document.contentBn ?? "",
});
