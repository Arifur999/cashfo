"use server";

import { customerApi } from "@/lib/customer/apiClient";
import { toClientErrorReport } from "./clientErrorReport";

// A customer page's crash, for the API's error log (POST /api/client-errors,
// with the customer's token; 10 a minute, 204 with no body). Called from an
// error boundary, so it never throws: a refusal (400, 401, 403, 429), the
// API in maintenance (503) or a slow call is dropped without a word.
export const reportClientError = async (values: unknown): Promise<void> => {
  try {
    await customerApi.post("/api/client-errors", toClientErrorReport(values), { timeout: 5000 });
  } catch {
    // Nothing to do: the page already shows the error.
  }
};
