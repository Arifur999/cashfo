"use server";

import { httpClient } from "@/lib/axios/httpClient";
import type { IAnnouncement, IAnnouncementPayload } from "@/types/announcement.types";

const BASE = "/admin/announcements";

// Newest start first, each with its computed status.
export const getAnnouncements = async () => httpClient.get<IAnnouncement[]>(BASE);

export const createAnnouncement = async (payload: IAnnouncementPayload) => httpClient.post<IAnnouncement>(BASE, payload);

export const updateAnnouncement = async (id: string, payload: Partial<IAnnouncementPayload> & { isActive?: boolean }) =>
  httpClient.patch<IAnnouncement>(`${BASE}/${id}`, payload);
