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
}

// What register and reset-password answer with: they sign a customer in.
export interface ICustomerSignInResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; preferredLanguage: LanguagePreference };
  defaultBusinessId: string;
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
