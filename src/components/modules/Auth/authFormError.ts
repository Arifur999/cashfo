import { BRAND_NAME } from "@/lib/brand";
import type { FillValues } from "@/lib/i18n/fill";

// What a sign-in page's form says when its action didn't go through.
export interface AuthFormError {
  // An English key, shown in the reader's language.
  message: string;
  values?: FillValues;
  // The page is older than the site it talks to: only a reload helps.
  reload?: boolean;
  // The API's reason for the refusal (CODE_WRONG...), and the tries left.
  reason?: string;
  attemptsLeft?: number;
}

export const UNREACHABLE_MESSAGE = "Unable to reach the server. Please try again.";
export const STALE_PAGE_MESSAGE = "{brand} was just updated. Reload the page and try again.";

// The API's answers a form adds a next step under.
export const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";
export const ACCOUNT_EXISTS_MESSAGE = "An account with this email already exists";

export type ThrownActionCall = { kind: "navigating" } | { kind: "failed"; error: AuthFormError };

// A successful action that redirects (every sign-in, sign-up and reset)
// rejects its promise with Next's redirect error while the router moves on.
const isRedirect = (thrown: unknown): boolean =>
  typeof thrown === "object" && thrown !== null && "digest" in thrown && typeof thrown.digest === "string" && thrown.digest.startsWith("NEXT_REDIRECT;");

// What a throw from calling a Server Action means. The actions never throw
// themselves, so anything else is the call failing on the way: a dropped
// connection, a 502 while the site restarts, or a tab opened before a deploy,
// whose action the new build no longer knows (Next's UnrecognizedActionError).
export function describeThrownActionCall(thrown: unknown): ThrownActionCall {
  if (isRedirect(thrown)) {
    return { kind: "navigating" };
  }
  if (thrown instanceof Error && thrown.name === "UnrecognizedActionError") {
    return { kind: "failed", error: { message: STALE_PAGE_MESSAGE, values: { brand: BRAND_NAME }, reload: true } };
  }
  return { kind: "failed", error: { message: UNREACHABLE_MESSAGE } };
}

// The API's RegisterDto takes up to 64 characters, and ignores a code it
// doesn't know.
export const INVITE_CODE_MAX_LENGTH = 64;

// An invite code as the API looks it up: trimmed, capped, and upper-case --
// every code is upper-case hex (ReferralsService), while one typed from a
// text message often isn't.
export const normalizeInviteCode = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  return value.trim().slice(0, INVITE_CODE_MAX_LENGTH).toUpperCase() || undefined;
};

// A message's figures in the reader's digits ("১৫ মিনিট").
export const localizeValues = (values: FillValues | undefined, toDigits: (value: number) => string): FillValues | undefined =>
  values && Object.fromEntries(Object.entries(values).map(([name, value]) => [name, typeof value === "number" ? toDigits(value) : value]));
