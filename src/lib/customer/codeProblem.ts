// What a refused six-digit code means for the person typing it: the words
// to show (a dictionary key and its values), and whether only a new code
// helps now.
export interface CodeProblem {
  message: string;
  values?: Record<string, string | number>;
  // The code can't be used any more: offer "Get a new code".
  gone: boolean;
}

// Refusals after which the code can't be used again.
const GONE = new Set(["CODE_EXPIRED", "TOO_MANY_ATTEMPTS", "CODE_USED", "CHALLENGE_NOT_FOUND", "TOO_MANY_SENDS"]);

// The API's own words for the reasons a phone flow can meet.
const MESSAGES: Record<string, string> = {
  CODE_EXPIRED: "This code has expired. Start again to get a new one.",
  TOO_MANY_ATTEMPTS: "Too many wrong codes. Start again to get a new one.",
  CODE_USED: "This code was already used. Start again to get a new one.",
  CHALLENGE_NOT_FOUND: "This confirmation was not found. Start again.",
  TOO_MANY_SENDS: "The code was sent too many times. Start again to get a new one.",
  RESEND_TOO_SOON: "Wait a moment before asking for the code again.",
  SMS_NOT_CONFIGURED: "Text messages cannot be sent right now. Please try again later.",
  CODE_NOT_SENT: "We couldn't send the code. Please try again in a minute.",
  PHONE_NOT_MOBILE: "Use a Bangladeshi mobile number, like 01712-345678.",
  PHONE_TAKEN: "This number is already verified on another account.",
  PHONE_CHANGED: "The number changed after the code was sent. Start again.",
  PHONE_ALREADY_VERIFIED: "This number is already verified.",
  NO_PHONE: "Add your phone number first.",
  WRONG_PASSWORD: "Your account password is incorrect",
  RECENT_SIGN_IN_REQUIRED: "For your safety, sign out and sign in again, then try this within 10 minutes.",
};

export function codeProblem(result: { reason?: string; message?: string; attemptsLeft?: number }): CodeProblem {
  const reason = result.reason ?? "";
  if (reason === "CODE_WRONG") {
    const left = result.attemptsLeft;
    if (left === 0) return { message: "Too many wrong codes. Start again to get a new one.", gone: true };
    if (left === undefined) return { message: "That code is not right.", gone: false };
    return { message: left === 1 ? "That code is not right. {count} try left." : "That code is not right. {count} tries left.", values: { count: left }, gone: false };
  }
  return { message: MESSAGES[reason] ?? result.message ?? "Something went wrong. Please try again.", gone: GONE.has(reason) };
}
