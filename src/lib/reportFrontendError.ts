"use server";

import axios from "axios";
import { API_BASE_URL } from "./api";
import { getAccessToken } from "./tokenCookies";

// Best-effort crash reporting from the admin frontend's error boundary to
// Prompt 9's POST /admin/system/errors (source: ADMIN_FRONTEND). Silently
// no-ops on failure -- an error boundary must never throw while reporting
// the error that triggered it.
export async function reportFrontendError(message: string, stackTrace?: string): Promise<void> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return;

    await axios.post(
      `${API_BASE_URL}/admin/system/errors`,
      { source: "ADMIN_FRONTEND", message, stackTrace, severity: "MEDIUM" },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
  } catch {
    // best-effort only
  }
}
