import "server-only";
import axios from "axios";
import { getClientHeaders } from "@/lib/axios/clientHeaders";
import { getAccessToken } from "@/lib/tokenUtils";
import { API_BASE_URL } from "./api";

// The customer app's way to the API -- every reader and action goes through
// it, so every call:
//   * forwards the visitor's X-Forwarded-For and User-Agent. The backend's
//     throttle counts per client address; without them every customer
//     shared this server's one bucket (100 requests a minute per route), and
//     a busy minute emptied everyone's pages.
//   * carries the signed-in customer's access token (a caller that sets its
//     own Authorization keeps it).
//   * gives up after 30 seconds, so a wedged API ends in the error screen
//     instead of a spinner that never stops.
export const customerApi = axios.create({ baseURL: API_BASE_URL, timeout: 30_000 });

customerApi.interceptors.request.use(async (config) => {
  const [accessToken, client] = await Promise.all([getAccessToken(), getClientHeaders()]);
  for (const [name, value] of Object.entries(client)) {
    if (!config.headers.has(name)) {
      config.headers.set(name, value);
    }
  }
  if (accessToken && !config.headers.has("Authorization")) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});
