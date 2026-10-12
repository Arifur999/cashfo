import type { LanguagePreference } from "./auth.types";

export interface ICustomerWorkspace {
  id: string;
  name: string;
  type: string;
  currency: string;
  role: string;
  isDefault: boolean;
  hasPinLock: boolean;
  trialEndsAt: string | null;
}

// GET /api/auth/me: the signed-in customer and the workspaces they belong to.
export interface ICustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  preferredLanguage: LanguagePreference;
  emailVerifiedAt: string | null;
  businesses: ICustomerWorkspace[];
}
