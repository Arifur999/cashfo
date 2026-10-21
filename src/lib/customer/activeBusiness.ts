import { cookies } from "next/headers";
import type { UserBusiness } from "./api";
import { switchableWorkspaces, switchTarget } from "./workspaceSwitch";

// The backend is deliberately stateless about which workspace is "active"
// (see backend/src/businesses/businesses.module.ts's top comment) --
// "switching" is a frontend-only concept. This cookie is that concept's one
// source of truth: httpOnly (only Server Actions/Components touch it, no
// client JS needs direct access -- the switcher UI gets the active id via
// AuthProvider, seeded from this on the server), persists across refreshes
// like any cookie, and is validated against the user's actual membership
// list on every read so a stale/tampered value can never select a workspace
// the user isn't (or is no longer) a member of. The backend checks the
// membership (and the PIN) on every request as well.
const ACTIVE_BUSINESS_COOKIE = "activeBusinessId";
const ACTIVE_BUSINESS_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export interface ActiveWorkspace {
  business: UserBusiness | null;
  // The stored choice named it. False when nothing was chosen on this
  // device yet, or the choice no longer counts (a deleted workspace, one
  // the account left, someone else's id, a group).
  remembered: boolean;
}

// Which workspace is open, from the account's memberships and the stored
// id. Only a personal or business membership can be open; anything else
// falls back to the account's own personal workspace, then the first.
export function pickActiveBusiness(businesses: UserBusiness[], storedId: string | null | undefined): ActiveWorkspace {
  const stored = switchTarget(businesses, storedId);
  if (stored) {
    return { business: stored, remembered: true };
  }
  const candidates = switchableWorkspaces(businesses);
  return { business: candidates.find((business) => business.isDefault) ?? candidates[0] ?? null, remembered: false };
}

async function storedBusinessId(): Promise<string | undefined> {
  return (await cookies()).get(ACTIVE_BUSINESS_COOKIE)?.value;
}

// The open workspace and whether it was chosen on this device -- the
// layout asks "Which workspace?" when it wasn't.
export async function resolveActiveWorkspace(businesses: UserBusiness[]): Promise<ActiveWorkspace> {
  return pickActiveBusiness(businesses, await storedBusinessId());
}

export async function resolveActiveBusinessId(businesses: UserBusiness[]): Promise<string | null> {
  return (await resolveActiveWorkspace(businesses)).business?.id ?? null;
}

// Set the way every cookie here is (lib/cookiesUtils.ts): httpOnly, lax,
// Secure in production. Only the actions in businessActions.ts call it,
// each with an id just read from the account's memberships: the switch's
// checked target, or the workspace that is open already.
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
