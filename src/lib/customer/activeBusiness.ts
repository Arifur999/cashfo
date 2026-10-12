import { cookies } from "next/headers";
import type { UserBusiness } from "./api";

// The backend is deliberately stateless about which workspace is "active"
// (see backend/src/businesses/businesses.module.ts's top comment) --
// "switching" is a frontend-only concept. This cookie is that concept's one
// source of truth: httpOnly (only Server Actions/Components touch it, no
// client JS needs direct access -- the switcher UI gets the active id via
// AuthProvider, seeded from this on the server), persists across refreshes
// like any cookie, and is validated against the user's actual membership
// list on every read so a stale/tampered value can never select a workspace
// the user isn't (or is no longer) a member of.
const ACTIVE_BUSINESS_COOKIE = "activeBusinessId";
const ACTIVE_BUSINESS_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

// Multi-workspace switching was removed by product decision -- every
// account is single-workspace now, so this always resolves to the one
// default workspace, ignoring any stored cookie from before that change
// (an account that had switched away to a since-hidden business workspace
// must not get stranded there).
export async function resolveActiveBusinessId(businesses: UserBusiness[]): Promise<string | null> {
  return businesses.find((b) => b.isDefault)?.id ?? businesses[0]?.id ?? null;
}

export async function setActiveBusinessCookie(businessId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_BUSINESS_COOKIE, businessId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACTIVE_BUSINESS_MAX_AGE_SECONDS,
  });
}
