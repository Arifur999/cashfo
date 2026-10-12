import type { TokenAudience } from "@/types/auth.types";
import { jwtUtils } from "./jwtUtils";

// Which side a token is for (its `aud`), and so which endpoints refresh and
// end it. null for a token that doesn't say -- one issued before tokens
// named their side, which the backend no longer accepts either.
export const getTokenAudience = (token: string): TokenAudience | null => {
  const audience = jwtUtils.decodeToken(token)?.aud;
  return audience === "admin" || audience === "user" ? audience : null;
};
