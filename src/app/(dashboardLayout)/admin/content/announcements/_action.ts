"use server";

import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import { createAnnouncement, deleteAnnouncement, restoreAnnouncement, updateAnnouncement } from "@/services/announcement.services";
import { announcementServerZodSchema } from "@/zod/announcement.validation";

export const createAnnouncementAction = async (values: unknown) =>
  runValidatedAction(announcementServerZodSchema, values, "Failed to create announcement", (payload) => createAnnouncement(payload));

export const deleteAnnouncementAction = async (announcementId: string) =>
  requireId(announcementId, "announcement") ?? runAction("Failed to delete announcement", () => deleteAnnouncement(announcementId));

export const restoreAnnouncementAction = async (announcementId: string) =>
  requireId(announcementId, "announcement") ?? runAction("Couldn't bring the announcement back", () => restoreAnnouncement(announcementId));

export const updateAnnouncementAction = async (announcementId: string, values: unknown) =>
  requireId(announcementId, "announcement") ??
  runValidatedAction(announcementServerZodSchema, values, "Failed to update announcement", (payload) =>
    updateAnnouncement(announcementId, payload),
  );

// Turns an announcement off (or back on) without touching its schedule.
export const setAnnouncementEnabledAction = async (announcementId: string, isActive: boolean) =>
  requireId(announcementId, "announcement") ??
  runAction(isActive ? "Failed to enable announcement" : "Failed to disable announcement", () =>
    updateAnnouncement(announcementId, { isActive }),
  );
