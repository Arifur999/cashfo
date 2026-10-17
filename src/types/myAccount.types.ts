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
