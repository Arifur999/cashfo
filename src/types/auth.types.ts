export type AdminRole = "SUPER_ADMIN" | "SUPPORT_ADMIN" | "FINANCE_ADMIN" | "CONTENT_ADMIN";

export interface IAdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
}

export interface ILoginPayload {
  email: string;
  password: string;
}

export interface ILoginResponse {
  accessToken: string;
  refreshToken: string;
  adminUser: IAdminUser;
}

// What the backend signs into the access token (see AdminAuthService).
export interface IAccessTokenPayload {
  sub: string;
  role: AdminRole;
  iat?: number;
  exp: number;
}
