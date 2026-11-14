"use server";

import axios, { isAxiosError } from "axios";
import { redirect } from "next/navigation";
import { getClientHeaders } from "@/lib/axios/clientHeaders";
import { completeSignIn } from "@/lib/completeSignIn";
import { API_BASE_URL } from "@/lib/customer/api";
import { USERNAME_PATTERN } from "@/lib/customer/groupAccess";
import { toAuthRefusal } from "@/lib/authRefusal";
import { getAccessToken } from "@/lib/tokenUtils";

export interface JoinAnswer {
  success: false;
  message: string;
  // Which field the message is about.
  field?: "username" | "password";
}

interface AcceptAnswer {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string };
  businessId: string;
}

const groupPath = (businessId: string) => `/group-expenses/${encodeURIComponent(businessId)}`;

// Uses an access link (/join/<token>): a join link makes the member's login
// with the username and password they chose, a reset link sets a new
// password. Either way this device is signed in and the group opens.
export async function acceptInviteAction(token: unknown, username: unknown, password: unknown): Promise<JoinAnswer> {
  if (typeof token !== "string" || !token) return { success: false, message: "This link no longer works. Ask your group admin for a new one." };
  const user = typeof username === "string" ? username.trim().toLowerCase() : undefined;
  if (user !== undefined && !USERNAME_PATTERN.test(user)) return { success: false, message: "Use 4 to 20 small letters, numbers, dot or underscore, like rakib.m", field: "username" };
  if (typeof password !== "string" || password.length < 8) return { success: false, message: "Use at least 8 characters.", field: "password" };

  let destination: string;
  try {
    const res = await axios.post<AcceptAnswer>(`${API_BASE_URL}/api/group-invites/${encodeURIComponent(token)}/accept`, { ...(user !== undefined && { username: user }), password }, { headers: await getClientHeaders(), timeout: 30_000 });
    const { accessToken, refreshToken, user: account, businessId } = res.data;
    destination = await completeSignIn({ audience: "user", accessToken, refreshToken, account: { ...account, role: "USER" } }, groupPath(businessId));
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 429) return { success: false, message: "Too many tries from this network. Try again in a few minutes." };
    const refusal = toAuthRefusal(error, "This link no longer works. Ask your group admin for a new one.");
    return { success: false, message: refusal.message, ...(refusal.status === 409 && { field: "username" as const }) };
  }
  redirect(destination);
}

// A join link opened while signed in: the group joins this account.
export async function attachInviteAction(token: unknown): Promise<JoinAnswer> {
  if (typeof token !== "string" || !token) return { success: false, message: "This link no longer works. Ask your group admin for a new one." };
  const accessToken = await getAccessToken();
  if (!accessToken) return { success: false, message: "Sign in first." };
  let businessId: string;
  try {
    const res = await axios.post<{ businessId: string }>(`${API_BASE_URL}/api/group-invites/${encodeURIComponent(token)}/attach`, {}, { headers: { ...(await getClientHeaders()), Authorization: `Bearer ${accessToken}` }, timeout: 30_000 });
    businessId = res.data.businessId;
  } catch (error) {
    return { success: false, message: toAuthRefusal(error, "This link no longer works. Ask your group admin for a new one.").message };
  }
  redirect(groupPath(businessId));
}
