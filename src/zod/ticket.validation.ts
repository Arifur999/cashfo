import { z } from "zod";
import {
  type ICreateTicketPayload,
  type ISavedReplyPayload,
  type ITicketReplyPayload,
  type IUpdateTicketPayload,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "@/types/ticket.types";

export const TICKET_SUBJECT_MAX_LENGTH = 200;
export const TICKET_MESSAGE_MAX_LENGTH = 5000;

const subjectSchema = z
  .string()
  .trim()
  .min(1, "Give the ticket a subject")
  .max(TICKET_SUBJECT_MAX_LENGTH, `At most ${TICKET_SUBJECT_MAX_LENGTH} characters`);

const messageSchema = z
  .string()
  .trim()
  .min(1, "Write a message")
  .max(TICKET_MESSAGE_MAX_LENGTH, `At most ${TICKET_MESSAGE_MAX_LENGTH} characters`);

// A. Form schemas -- what the fields hold while the admin types.
export const createTicketFormZodSchema = z.object({
  userId: z.string().min(1, "Pick the customer this ticket is for"),
  subject: subjectSchema,
  category: z.enum(TICKET_CATEGORIES, "Choose a category"),
  priority: z.enum(TICKET_PRIORITIES, "Choose a priority"),
  initialMessage: messageSchema,
});

export type ICreateTicketFormValues = z.infer<typeof createTicketFormZodSchema>;

export const ticketReplyFormZodSchema = z.object({ message: messageSchema });

export type ITicketReplyFormValues = z.infer<typeof ticketReplyFormZodSchema>;

// B. Server schemas -- re-checked inside the actions. Trimming happens here,
// so the API never stores the padding around a message.
export const createTicketServerZodSchema = createTicketFormZodSchema satisfies z.ZodType<ICreateTicketPayload>;

// The reply as the API takes it: a note for admins (isInternal), the
// status to set once it is saved, and a link it carries.
export const ticketReplyServerZodSchema = ticketReplyFormZodSchema.extend({
  isInternal: z.boolean().optional(),
  status: z.enum(TICKET_STATUSES).optional(),
  attachmentUrl: z.url("Enter a link that starts with https://").max(2000).optional(),
}) satisfies z.ZodType<ITicketReplyPayload>;

// A picture on a reply, by the API's rules for a customer's screenshot.
export const REPLY_PICTURE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const REPLY_PICTURE_MAX_BYTES = 5 * 1024 * 1024;

export const SAVED_REPLY_TITLE_MAX_LENGTH = 120;

// A saved reply: a short name the team picks it by, and its English and
// (optional) Bangla text.
export const savedReplyFormZodSchema = z.object({
  title: z.string().trim().min(1, "Give it a short name").max(SAVED_REPLY_TITLE_MAX_LENGTH, `At most ${SAVED_REPLY_TITLE_MAX_LENGTH} characters`),
  bodyEn: messageSchema,
  bodyBn: z.string().trim().max(TICKET_MESSAGE_MAX_LENGTH, `At most ${TICKET_MESSAGE_MAX_LENGTH} characters`),
});

export type ISavedReplyFormValues = z.infer<typeof savedReplyFormZodSchema>;

// An empty Bangla body is sent as null: the reply box then uses the English.
export const savedReplyServerZodSchema = savedReplyFormZodSchema.transform((values) => ({ ...values, bodyBn: values.bodyBn || null })) satisfies z.ZodType<ISavedReplyPayload>;

export const updateTicketServerZodSchema = z
  .object({
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    category: z.enum(TICKET_CATEGORIES).optional(),
  })
  .refine((values) => values.status !== undefined || values.priority !== undefined || values.category !== undefined, "Nothing to update") satisfies z.ZodType<IUpdateTicketPayload>;

// null unassigns the ticket.
export const assignTicketServerZodSchema = z.object({ adminId: z.string().min(1).nullable() });
