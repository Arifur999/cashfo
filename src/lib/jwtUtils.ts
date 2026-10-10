import jwt, { type JwtPayload } from "jsonwebtoken";

// Decode only -- never verify. This frontend deliberately doesn't hold the
// backend's JWT secret (it stays in cashfo_backend), so a decoded payload is
// a UX-level hint for routing, not the security boundary: the backend's
// AdminAuthGuard verifies the signature on every real request.
//
// Never throws; callers branch on null instead of try/catching.
const decodeToken = <TPayload extends JwtPayload = JwtPayload>(token: string): TPayload | null => {
  const payload = jwt.decode(token);
  if (!payload || typeof payload !== "object") {
    return null;
  }
  return payload as TPayload;
};

export const jwtUtils = { decodeToken };
