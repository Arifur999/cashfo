"use server";

import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import { addTicketMessage, addTicketMessageWithPicture, assignTicket, createSavedReply, createTicket, deleteSavedReply, updateSavedReply, updateTicket } from "@/services/ticket.services";
import {
  REPLY_PICTURE_MAX_BYTES,
  REPLY_PICTURE_TYPES,
  assignTicketServerZodSchema,
  createTicketServerZodSchema,
  savedReplyServerZodSchema,
  ticketReplyServerZodSchema,
  updateTicketServerZodSchema,
} from "@/zod/ticket.validation";

export const createTicketAction = async (values: unknown) =>
  runValidatedAction(createTicketServerZodSchema, values, "Failed to create ticket", (payload) => createTicket(payload));

export const updateTicketAction = async (ticketId: string, values: unknown) =>
  requireId(ticketId, "ticket") ??
  runValidatedAction(updateTicketServerZodSchema, values, "Failed to update ticket", (payload) => updateTicket(ticketId, payload));

export const replyToTicketAction = async (ticketId: string, values: unknown) =>
  requireId(ticketId, "ticket") ??
  runValidatedAction(ticketReplyServerZodSchema, values, "Failed to send reply", (payload) => addTicketMessage(ticketId, payload));

// A reply with one picture (JPEG, PNG or WEBP, 5 MB at most), sent as the
// reply box's form: message, an optional status, and the picture in `file`.
// The fields are checked again here before the API sees them.
export const replyWithPictureAction = async (ticketId: string, form: FormData) => {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { success: false as const, message: "Pick a picture to send" };
  if (!(REPLY_PICTURE_TYPES as readonly string[]).includes(file.type)) return { success: false as const, message: "Only JPEG, PNG or WEBP pictures can go with a reply" };
  if (file.size > REPLY_PICTURE_MAX_BYTES) return { success: false as const, message: "The picture is bigger than 5 MB" };
  const status = form.get("status");
  const values = { message: String(form.get("message") ?? ""), ...(typeof status === "string" && status && { status }) };
  return (
    requireId(ticketId, "ticket") ??
    runValidatedAction(ticketReplyServerZodSchema, values, "Failed to send reply", (payload) => {
      const body = new FormData();
      body.set("message", payload.message);
      if (payload.status) body.set("status", payload.status);
      body.set("file", file, file.name);
      return addTicketMessageWithPicture(ticketId, body);
    })
  );
};

export const assignTicketAction = async (ticketId: string, values: unknown) =>
  requireId(ticketId, "ticket") ??
  runValidatedAction(assignTicketServerZodSchema, values, "Failed to assign ticket", ({ adminId }) => assignTicket(ticketId, adminId));

export const createSavedReplyAction = async (values: unknown) =>
  runValidatedAction(savedReplyServerZodSchema, values, "Failed to save the reply", (payload) => createSavedReply(payload));

export const updateSavedReplyAction = async (replyId: string, values: unknown) =>
  requireId(replyId, "saved reply") ??
  runValidatedAction(savedReplyServerZodSchema, values, "Failed to save the reply", (payload) => updateSavedReply(replyId, payload));

export const deleteSavedReplyAction = async (replyId: string) =>
  requireId(replyId, "saved reply") ?? runAction("Failed to delete the reply", () => deleteSavedReply(replyId));
