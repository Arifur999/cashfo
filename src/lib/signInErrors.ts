// What the login page says when Google sign-in comes back with ?error=.
// "suspended" and "failed" come from app/(auth)/login/google/route.ts, the
// rest from better-auth's OAuth callback.
const SIGN_IN_ERRORS: Record<string, string> = {
  suspended: "This account has been suspended. Contact support for help.",
  account_not_linked: "This email already has an account. Sign in with your password.",
  access_denied: "Google sign-in was cancelled.",
  email_not_found: "Google didn't share an email address with us.",
  signup_disabled: "No account uses that Google address yet.",
  // Admin > Settings has new sign-ups turned off (backend SIGNUPS_CLOSED).
  // A password reset whose two-step code step ended or was left
  // (components/modules/Auth/ResetPasswordFlow.tsx).
  password_changed: "Your new password is saved. Sign in with it to carry on.",
  signups_closed: "New sign-ups are closed for now. If you already have an account, sign in.",
};

const FALLBACK_MESSAGE = "Google sign-in didn't finish. Please try again.";

export const getSignInErrorMessage = (code: string | undefined): string | undefined => {
  if (!code) {
    return undefined;
  }
  const normalized = code.toLowerCase();
  // The backend refuses to open a session for an account that isn't ACTIVE;
  // better-auth passes that refusal on as an upper-case code.
  if (normalized.includes("not_active")) {
    return SIGN_IN_ERRORS.suspended;
  }
  return SIGN_IN_ERRORS[normalized] ?? FALLBACK_MESSAGE;
};
