"use server";

import { requireId, runAction, runValidatedAction } from "@/lib/runAction";
import { addTicketMessage, assignTicket, createSavedReply, createTicket, deleteSavedReply, updateSavedReply, updateTicket } from "@/services/ticket.services";
import {
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
