// A device the signed-in admin is signed in on.
export interface IMySession {
  id: string;
  // "Chrome on Windows", from the user agent.
  deviceLabel: string;
  ipAddress: string | null;
  // The country the address is in, when it can be placed.
  place: string | null;
  signedInAt: string;
  lastActiveAt: string;
  // The device this page is open on.
  current: boolean;
}

// One of the newest tries to sign in with the admin's own email.
export interface IMySignIn {
  id: string;
  success: boolean;
  // "invalid_password", "rate_limited", ...
  failureReason: string | null;
  ipAddress: string;
  createdAt: string;
  deviceLabel: string;
}

// A computer that skips the two-step code for 30 days ("trust this
// computer" at sign-in).
export interface IMyTrustedDevice {
  id: string;
  deviceLabel: string;
  ipAddress: string | null;
  place: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  // This browser.
  current: boolean;
}

// GET /admin/auth/two-step: the admin's own two-step sign-in.
export interface IMyTwoStep {
  enabled: boolean;
  enabledAt: string | null;
  setupPending: boolean;
  backupCodesLeft: number;
  trustedDevices: IMyTrustedDevice[];
  // A super admin made it required for every admin: it can't be turned off.
  required: boolean;
}

// What a two-step call answers when it fails: the API's reason
// (CODE_WRONG, BACKUP_CODE_WRONG...) so the dialog can say what to do.
export interface ITwoStepFailure {
  success: false;
  message: string;
  reason?: string;
}
