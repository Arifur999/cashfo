"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { ILegalDocument, ILegalVersion, IUpdateLegalDocumentPayload, LegalDocType } from "@/types/legalDocument.types";

const BASE = "/admin/config/legal";

export const getLegalDocuments = async () => httpClient.get<ILegalDocument[]>(BASE);

// Saving always creates the next version.
export const updateLegalDocument = async (type: LegalDocType, payload: IUpdateLegalDocumentPayload) =>
  httpClient.patch<ILegalDocument>(`${BASE}/${type}`, payload);

// Every version of one page, newest first; the open draft among them.
export const getLegalVersions = async (type: LegalDocType) => httpClient.get<ILegalVersion[]>(`${BASE}/${type}/versions`);

// Save draft: updates the page's open draft, or starts one.
export const saveLegalDraft = async (type: LegalDocType, payload: IUpdateLegalDocumentPayload) => httpClient.post<ILegalVersion>(`${BASE}/${type}/drafts`, payload);

export const discardLegalDraft = async (type: LegalDocType, id: string) => httpClient.delete<{ success: boolean }>(`${BASE}/${type}/drafts/${id}`);

// The draft becomes the live page, as the next version.
export const publishLegalDraft = async (type: LegalDocType, id: string) => httpClient.post<ILegalVersion>(`${BASE}/${type}/versions/${id}/publish`);
