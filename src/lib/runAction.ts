import type { z } from "zod";
import type { ApiErrorResponse, ApiResponse, ApiResult } from "@/types/api.types";
import { toActionError } from "./actionError";

// What every _action.ts does, written once: (re-)validate the input on the
// server, call the service, and turn any throw into
// { success: false, message } -- so an action never throws and a component
// never needs a try/catch. Actions become one-liners over these.

export const toValidationError = (error: z.ZodError): ApiErrorResponse => ({
  success: false,
  message: error.issues[0]?.message ?? "Invalid input",
});

export const runAction = async <TData>(fallbackMessage: string, run: () => Promise<ApiResponse<TData>>): Promise<ApiResult<TData>> => {
  try {
    return await run();
  } catch (error) {
    return toActionError(error, fallbackMessage);
  }
};

// Never trust the client-side validation pass alone: the input is parsed
// again here with the server schema before it reaches the API.
export const runValidatedAction = async <TSchema extends z.ZodType, TData>(
  schema: TSchema,
  values: unknown,
  fallbackMessage: string,
  run: (data: z.output<TSchema>) => Promise<ApiResponse<TData>>,
): Promise<ApiResult<TData>> => {
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return toValidationError(parsed.error);
  }
  return runAction(fallbackMessage, () => run(parsed.data));
};

// Rejects an empty id before it can turn into a request to a collection URL.
export const requireId = (id: string | undefined, label = "record"): ApiErrorResponse | null =>
  id ? null : { success: false, message: `Invalid ${label} id` };
