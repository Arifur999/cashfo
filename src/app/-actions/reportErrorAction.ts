"use server";

import { runValidatedAction } from "@/lib/runAction";
import { reportFrontendError } from "@/services/system.services";
import { errorReportServerZodSchema } from "@/zod/errorReport.validation";

// Cross-cutting (any page's error boundary), so it lives in app/-actions.
// Like every action it never throws -- which matters doubly here, inside an
// error boundary.
export const reportErrorAction = async (values: unknown) =>
  runValidatedAction(errorReportServerZodSchema, values, "Failed to report the error", (report) => reportFrontendError(report));
