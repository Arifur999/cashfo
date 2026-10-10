import { isAxiosError } from "axios";
import type { ApiErrorResponse } from "@/types/api.types";

// Turns whatever a service threw into the single message an _action.ts
// returns as { success: false, message }. Extracted once here instead of a
// callApi()/getApiErrorMessage() copy in every action file.
//
// Precedence: the API's own message (NestJS sends a string, or a string[]
// for class-validator failures), then "the request never reached the API",
// then a plain Error's message, then the caller's fallback.
export const getActionErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (isAxiosError(error)) {
    // No response at all means the backend never answered -- say so instead
    // of a misleading "Invalid email or password"-style fallback.
    if (!error.response) {
      return "Unable to reach the server. Is the backend running?";
    }

    const message = (error.response.data as { message?: unknown } | undefined)?.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
    if (Array.isArray(message) && message.length > 0) {
      return message.join(", ");
    }
    return fallbackMessage;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
};

export const toActionError = (error: unknown, fallbackMessage: string): ApiErrorResponse => ({
  success: false,
  message: getActionErrorMessage(error, fallbackMessage),
});
