"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { ILegalDocument, IUpdateLegalDocumentPayload, LegalDocType } from "@/types/legalDocument.types";

const BASE = "/admin/config/legal";

export const getLegalDocuments = async () => httpClient.get<ILegalDocument[]>(BASE);

// Saving always creates the next version.
export const updateLegalDocument = async (type: LegalDocType, payload: IUpdateLegalDocumentPayload) =>
  httpClient.patch<ILegalDocument>(`${BASE}/${type}`, payload);
