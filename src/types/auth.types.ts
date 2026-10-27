export type AdminRole = "SUPER_ADMIN" | "SUPPORT_ADMIN" | "FINANCE_ADMIN" | "CONTENT_ADMIN";
export type Role = AdminRole | "USER";

// Which side a token pair is for: admin tokens open /admin, user tokens the
// customer app. The backend signs it into both tokens as `aud`, and the two
// sides use different secrets, so a token never works on the other side.
export type TokenAudience = "admin" | "user";

export type LanguagePreference = "EN" | "BN";

export interface IAdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  // When their password was last set (My account); null for a Google-only
  // account.
  passwordChangedAt?: string | null;
}

export interface ISignInPayload {
  email: string;
  password: string;
}

// POST /api/auth/sign-in and /api/auth/session/sign-in: one sign-in for
// everyone, answered on the side the account's role belongs to.
export interface ISignInResponse {
  audience: TokenAudience;
  accessToken: string;
  refreshToken: string;
  account: { id: string; name: string; email: string; role: Role };
  // Customers only: the workspace the app opens first.
  defaultBusinessId?: string;
  // Customers only: this sign-in restored an account that was waiting out
  // the 30 days after "Delete my account".
  restoredFromDeletion?: boolean;
}

// What a sign-in answers instead of tokens while two-step sign-in still has
// a step to go (backend TwoStepService): the code from the authenticator
// app, or -- for an admin while two-step is required for every admin and
// theirs isn't on yet -- setting it up first.
export interface ITwoStepRequired {
  twoStepRequired: true;
  challengeToken: string;
  audience: TokenAudience;
  expiresAt: string;
  email: string;
}

export interface ITwoStepSetupRequired {
  twoStepSetupRequired: true;
  setupToken: string;
  audience: "admin";
  expiresAt: string;
  email: string;
}

export type ITwoStepPending = ITwoStepRequired | ITwoStepSetupRequired;

export const isTwoStepPending = (answer: object): answer is ITwoStepPending => "twoStepRequired" in answer || "twoStepSetupRequired" in answer;

// POST /api/auth/sign-in/two-step, and an admin's two-step set-up finished
// at sign-in: the usual sign-in, plus the 30-day token when the computer was
// trusted.
export interface ITwoStepSignInResponse extends ISignInResponse {
  trustedDeviceToken?: string;
  trustedDeviceExpiresAt?: string;
  // After a backup code: how many are left.
  backupCodesLeft?: number;
  // After setting two-step up at sign-in: the ten backup codes, shown once.
  backupCodes?: string[];
}

export interface IRegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  preferredLanguage?: LanguagePreference;
  // From a ?ref= sign-up link; an unknown code is ignored, never an error.
  referralCode?: string;
}

export interface IResetPasswordPayload {
  token: string;
  newPassword: string;
  // The emailed code, when the account asks for one before a reset.
  challengeId?: string;
  code?: string;
}

// What register and reset-password answer with: they sign a customer in.
export interface ICustomerSignInResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; preferredLanguage: LanguagePreference };
  defaultBusinessId: string;
  restoredFromDeletion?: boolean;
}

// What the backend signs into the access token (SessionTokensService).
export interface IAccessTokenPayload {
  sub: string;
  // The better-auth session the token is bound to.
  sid: string;
  aud: TokenAudience;
  role: Role;
  iat?: number;
  exp: number;
}

export interface IRefreshTokenPayload {
  sub: string;
  sid: string;
  aud: TokenAudience;
  exp: number;
}
