import { z } from "zod";

// What the dashboard error boundary reports. Bounded, since it's whatever the
// crashed page happened to throw -- an unbounded stack shouldn't be able to
// flood the error log.
export const errorReportServerZodSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  stackTrace: z.string().max(20000).optional(),
});

export type IErrorReport = z.infer<typeof errorReportServerZodSchema>;
