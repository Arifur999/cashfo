import "server-only";
import axios from "axios";
import { getClientHeaders } from "@/lib/axios/clientHeaders";
import { API_BASE_URL } from "@/lib/axios/httpClient";

export type ResetLinkStatus = "valid" | "invalid" | "unknown";

// Whether a reset link still works, asked without using it (GET
// /api/auth/reset-password/check), so an expired, used or superseded link
// says so before a new password is typed twice. Only a clear "no" counts:
// anything else -- an API without the route yet, maintenance, a slow or
// failed call -- shows the form as before, and saving checks the link anyway.
// The visitor's address goes along, as the check is throttled per client.
export async function getResetLinkStatus(token: string): Promise<ResetLinkStatus> {
  try {
    const { data } = await axios.get<{ valid?: unknown }>(`${API_BASE_URL}/api/auth/reset-password/check`, {
      params: { token },
      headers: await getClientHeaders(),
      timeout: 5000,
    });
    if (data?.valid === true) return "valid";
    return data?.valid === false ? "invalid" : "unknown";
  } catch {
    return "unknown";
  }
}
