"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { IAnnouncement, IAnnouncementPayload } from "@/types/announcement.types";

const BASE = "/admin/announcements";

// Newest start first, each with its computed status.
export const getAnnouncements = async () => httpClient.get<IAnnouncement[]>(BASE);

export const createAnnouncement = async (payload: IAnnouncementPayload) => httpClient.post<IAnnouncement>(BASE, payload);

// Deleted for everyone: gone from the apps and their bells at once, kept
// for the Undo (restoreAnnouncement).
export const deleteAnnouncement = async (id: string) => httpClient.delete<{ id: string }>(`${BASE}/${encodeURIComponent(id)}`);

export const updateAnnouncement = async (id: string, payload: Partial<IAnnouncementPayload> & { isActive?: boolean }) =>
  httpClient.patch<IAnnouncement>(`${BASE}/${id}`, payload);

// The Undo after a delete: back in the apps and the bells it was in.
export const restoreAnnouncement = async (id: string) => httpClient.post<IAnnouncement>(`${BASE}/${encodeURIComponent(id)}/restore`);
