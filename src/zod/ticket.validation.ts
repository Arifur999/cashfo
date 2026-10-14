import { z } from "zod";
import {
  type ICreateTicketPayload,
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

export const ticketReplyServerZodSchema = ticketReplyFormZodSchema;

export const updateTicketServerZodSchema = z
  .object({
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
  })
  .refine((values) => values.status !== undefined || values.priority !== undefined, "Nothing to update") satisfies z.ZodType<IUpdateTicketPayload>;

// null unassigns the ticket.
export const assignTicketServerZodSchema = z.object({ adminId: z.string().min(1).nullable() });
