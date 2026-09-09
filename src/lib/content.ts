import axios from "axios";
import {
  API_BASE_URL,
  type AccountTemplate,
  type AnnouncementRow,
  type DefaultCategory,
  type LegalDocumentRow,
  type TranslationStringRow,
} from "./api";
import { getAccessToken } from "./tokenCookies";

async function authHeaders() {
  const accessToken = await getAccessToken();
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getAccountTemplates(): Promise<AccountTemplate[]> {
  const res = await axios.get<AccountTemplate[]>(`${API_BASE_URL}/admin/config/account-templates`, {
    headers: await authHeaders(),
  });
  return res.data;
}

export async function getCategories(): Promise<DefaultCategory[]> {
  const res = await axios.get<DefaultCategory[]>(`${API_BASE_URL}/admin/config/categories`, { headers: await authHeaders() });
  return res.data;
}

export async function getTranslations(queryString: string): Promise<TranslationStringRow[]> {
  const res = await axios.get<TranslationStringRow[]>(`${API_BASE_URL}/admin/config/translations?${queryString}`, {
    headers: await authHeaders(),
  });
  return res.data;
}

export async function getAnnouncements(): Promise<AnnouncementRow[]> {
  const res = await axios.get<AnnouncementRow[]>(`${API_BASE_URL}/admin/announcements`, { headers: await authHeaders() });
  return res.data;
}

export async function getLegalDocuments(): Promise<LegalDocumentRow[]> {
  const res = await axios.get<LegalDocumentRow[]>(`${API_BASE_URL}/admin/config/legal`, { headers: await authHeaders() });
  return res.data;
}
