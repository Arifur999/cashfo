import "server-only";
import axios from "axios";
import { getClientHeaders } from "@/lib/axios/clientHeaders";
import { toSafeApiError } from "@/lib/axios/safeApiError";
import { getAccessToken, getWorkspaceUnlock } from "@/lib/tokenUtils";
import { API_BASE_URL } from "./api";

// The customer app's way to the API -- every reader and action goes through
// it, so every call:
//   * forwards the visitor's X-Forwarded-For and User-Agent. The backend's
//     throttle counts per client address; without them every customer
//     shared this server's one bucket (100 requests a minute per route), and
//     a busy minute emptied everyone's pages.
//   * carries the signed-in customer's access token (a caller that sets its
//     own Authorization keeps it).
//   * carries the unlock of the PIN-locked workspace it reads, if this
//     device has one; without it the API answers 423.
//   * gives up after 30 seconds, so a wedged API ends in the error screen
//     instead of a spinner that never stops.
export const customerApi = axios.create({ baseURL: API_BASE_URL, timeout: 30_000 });

const WORKSPACE_PATH = /\/api\/businesses\/([^/?#]+)/;

customerApi.interceptors.request.use(async (config) => {
  const businessId = WORKSPACE_PATH.exec(config.url ?? "")?.[1];
  const [accessToken, client, workspaceUnlock] = await Promise.all([
    getAccessToken(),
    getClientHeaders(),
    businessId ? getWorkspaceUnlock(businessId) : undefined,
  ]);
  for (const [name, value] of Object.entries(client)) {
    if (!config.headers.has(name)) {
      config.headers.set(name, value);
    }
  }
  if (accessToken && !config.headers.has("Authorization")) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (workspaceUnlock) {
    config.headers.set("x-workspace-unlock", workspaceUnlock);
  }
  return config;
});

// A failed call rejects with a copy that keeps the status and the API's answer
// but not the request config -- its headers hold the access token, and an
// error that escapes into a render or a Server Action is logged whole.
customerApi.interceptors.response.use(undefined, (error: unknown) => Promise.reject(toSafeApiError(error)));
