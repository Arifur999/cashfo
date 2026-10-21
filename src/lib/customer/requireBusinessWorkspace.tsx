import type { ReactElement } from "react";
import { redirect } from "next/navigation";
import { BooksWorkspaceNotice } from "@/components/modules/Customer/Workspace/BooksWorkspaceNotice";
import { LOGIN_ROUTE } from "@/lib/authUtils";
import { resolveActiveBusinessId } from "./activeBusiness";
import type { CurrentUser, UserBusiness } from "./api";
import { getCurrentUser } from "./auth";

export type BusinessWorkspace =
  | { ok: true; user: CurrentUser; businessId: string; business: UserBusiness }
  | { ok: false; notice: ReactElement };

// The Books pages (accounts, customers and suppliers, receivables and
// payables, journal entries) belong to a business workspace. In any other
// workspace the page shows a notice instead -- open a business workspace
// right there, make one, or go home -- rather than empty books or the API's
// refusal. The API checks the membership on every request regardless.
//
//   const books = await requireBusinessWorkspace();
//   if (!books.ok) return books.notice;
export async function requireBusinessWorkspace(): Promise<BusinessWorkspace> {
  const user = await getCurrentUser();
  if (!user) redirect(LOGIN_ROUTE);

  const businessId = await resolveActiveBusinessId(user.businesses);
  const business = businessId ? user.businesses.find((b) => b.id === businessId) : undefined;
  if (!business || business.type !== "BUSINESS") {
    return { ok: false, notice: <BooksWorkspaceNotice /> };
  }
  return { ok: true, user, businessId: business.id, business };
}
