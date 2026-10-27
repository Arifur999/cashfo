import { isAxiosError } from "axios";
import { toActionError } from "./actionError";

// A sign-in page's refusal, as its Server Action hands it to the form: the
// message (an English key, with its {placeholders}), and the API's own
// reason when it gave one (CODE_WRONG, CHALLENGE_EXPIRED, SIGNUPS_CLOSED...)
// so the form can do the right next thing.
export interface AuthRefusal {
  success: false;
  message: string;
  values?: Record<string, string | number>;
  reason?: string;
  status?: number;
  // A wrong code: how many tries are left before the step ends.
  attemptsLeft?: number;
}

// What a service threw, read the way every auth action reads it: the
// throttle in words (toActionError), the API's message, and its reason and
// tries left from the body.
export function toAuthRefusal(error: unknown, fallbackMessage: string): AuthRefusal {
  const base = toActionError(error, fallbackMessage);
  if (!isAxiosError(error) || !error.response) return base;
  const body = (error.response.data ?? {}) as { reason?: unknown; attemptsLeft?: unknown };
  return {
    ...base,
    status: error.response.status,
    ...(typeof body.reason === "string" && { reason: body.reason }),
    ...(typeof body.attemptsLeft === "number" && { attemptsLeft: body.attemptsLeft }),
  };
}
