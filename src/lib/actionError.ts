import { isAxiosError } from "axios";
import type { ApiErrorResponse } from "@/types/api.types";

export const TOO_MANY_ATTEMPTS_MESSAGE = "Too many attempts. Please wait a few minutes and try again.";

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
      return "Unable to reach the server. Please try again.";
    }
    // The throttler's own body reads "ThrottlerException: Too Many Requests".
    // (toActionError says how long to wait when the answer tells it.)
    if (error.response.status === 429) {
      return TOO_MANY_ATTEMPTS_MESSAGE;
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

// The answer's headers as a plain list. A raw axios answer keeps them in an
// AxiosHeaders (its own enumerable properties); a test may hand an object.
const headerEntries = (headers: unknown): [string, unknown][] => (headers && typeof headers === "object" ? Object.entries(headers) : []);

// How long the API's throttler says to wait, in whole seconds: Retry-After,
// or a named throttler's Retry-After-<name> (the sign-in routes count per
// address as "perIp"), the longest when there are several. null when the
// answer names no wait.
export const retryAfterSeconds = (headers: unknown): number | null => {
  let longest: number | null = null;
  for (const [name, value] of headerEntries(headers)) {
    if (!/^retry-after(-|$)/i.test(name)) continue;
    const text = Array.isArray(value) ? value[0] : value;
    const seconds = typeof text === "number" ? text : typeof text === "string" && /^\d+$/.test(text.trim()) ? Number(text.trim()) : Number.NaN;
    if (Number.isFinite(seconds) && seconds >= 0) longest = Math.max(longest ?? 0, seconds);
  }
  return longest;
};

// A 429 in words. The API's throttler always names its wait; an answer
// that doesn't (from a proxy in between) gets the sign-in limits' window,
// 15 minutes. An error whose headers were left behind on the way here (the
// panel's own HTTP clients keep only the status and the body) can't tell,
// and keeps the general message.
const tooManyAttempts = (response: { headers?: unknown }): ApiErrorResponse => {
  if (!response.headers) return { success: false, message: TOO_MANY_ATTEMPTS_MESSAGE };
  const seconds = retryAfterSeconds(response.headers);
  if (seconds === null) return { success: false, message: "Too many attempts. Wait up to 15 minutes, then try again." };
  if (seconds <= 60) return { success: false, message: "Too many attempts. Try again in a minute." };
  return { success: false, message: "Too many attempts. Try again in {minutes} minutes.", values: { minutes: Math.ceil(seconds / 60) } };
};

export const toActionError = (error: unknown, fallbackMessage: string): ApiErrorResponse => {
  if (isAxiosError(error) && error.response?.status === 429) {
    return tooManyAttempts(error.response);
  }
  return { success: false, message: getActionErrorMessage(error, fallbackMessage) };
};
