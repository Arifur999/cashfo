// What every Referrals page reads first: the signed-in customer, the open
// workspace (its currency), where the app is served from (for invite
// links) and the app's today. Server-only.
import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAppToday } from "@/lib/date";
import { resolveActiveBusinessId } from "./activeBusiness";
import { getCurrentUser } from "./auth";
import { showsLockedPage } from "./referralDisplay";
import { getReferralInfo } from "./referrals";

// This site's own address, from the request it came in on (behind the
// proxy's forwarded host and scheme), so links are right on the server render.
export async function requestOrigin(): Promise<string> {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "";
  if (!host) return "";
  const protocol = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export async function referralPageContext() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");
  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId) ?? null;
  return {
    user,
    activeBusinessId,
    activeBusiness,
    currency: activeBusiness?.currency ?? "BDT",
    origin: await requestOrigin(),
    today: getAppToday(),
  };
}

// The program's numbers for a page other than the dashboard; a member who
// sees the Free-plan page has none of them, so goes back there.
export async function referralInfoForPage() {
  const info = await getReferralInfo();
  if (info && showsLockedPage(info)) redirect("/referrals");
  return info;
}
