"use server";

import { requireId, runValidatedAction } from "@/lib/runAction";
import { addTicketMessage, assignTicket, createTicket, updateTicket } from "@/services/ticket.services";
import {
  assignTicketServerZodSchema,
  createTicketServerZodSchema,
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
  runValidatedAction(ticketReplyServerZodSchema, values, "Failed to send reply", ({ message }) => addTicketMessage(ticketId, message));

export const assignTicketAction = async (ticketId: string, values: unknown) =>
  requireId(ticketId, "ticket") ??
  runValidatedAction(assignTicketServerZodSchema, values, "Failed to assign ticket", ({ adminId }) => assignTicket(ticketId, adminId));
