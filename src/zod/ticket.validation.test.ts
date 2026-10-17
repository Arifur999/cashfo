import { describe, expect, it } from "vitest";
import {
  assignTicketServerZodSchema,
  createTicketServerZodSchema,
  ticketReplyServerZodSchema,
  updateTicketServerZodSchema,
} from "./ticket.validation";

const validTicket = {
  userId: "11111111-1111-4111-8111-111111111111",
  subject: "  Can't export my report  ",
  category: "TECHNICAL",
  priority: "HIGH",
  initialMessage: "  The PDF export spins forever.  ",
};

describe("createTicketServerZodSchema", () => {
  it("trims the subject and message before they reach the API", () => {
    const result = createTicketServerZodSchema.safeParse(validTicket);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subject).toBe("Can't export my report");
      expect(result.data.initialMessage).toBe("The PDF export spins forever.");
    }
  });

  it("requires a user to be picked", () => {
    expect(createTicketServerZodSchema.safeParse({ ...validTicket, userId: "" }).success).toBe(false);
  });

  it("rejects a whitespace-only subject", () => {
    expect(createTicketServerZodSchema.safeParse({ ...validTicket, subject: "   " }).success).toBe(false);
  });

  it("rejects a category the API doesn't know", () => {
    expect(createTicketServerZodSchema.safeParse({ ...validTicket, category: "SALES" }).success).toBe(false);
  });
});

describe("ticketReplyServerZodSchema", () => {
  it("rejects an empty reply", () => {
    expect(ticketReplyServerZodSchema.safeParse({ message: " \n " }).success).toBe(false);
  });
});

describe("updateTicketServerZodSchema", () => {
  it("accepts a status-only change", () => {
    expect(updateTicketServerZodSchema.safeParse({ status: "RESOLVED" }).success).toBe(true);
  });

  it("accepts a change of type", () => {
    expect(updateTicketServerZodSchema.safeParse({ category: "BILLING" }).success).toBe(true);
  });

  it("rejects an empty update", () => {
    expect(updateTicketServerZodSchema.safeParse({}).success).toBe(false);
  });

  it("rejects an unknown status", () => {
    expect(updateTicketServerZodSchema.safeParse({ status: "DONE" }).success).toBe(false);
  });
});

describe("assignTicketServerZodSchema", () => {
  it("accepts null to unassign", () => {
    expect(assignTicketServerZodSchema.safeParse({ adminId: null }).success).toBe(true);
  });

  it("rejects an empty admin id", () => {
    expect(assignTicketServerZodSchema.safeParse({ adminId: "" }).success).toBe(false);
  });
});
