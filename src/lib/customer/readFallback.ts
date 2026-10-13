import { isAxiosError } from "axios";
import { logServiceError } from "@/lib/axios/logServiceError";
import { toRenderSafeError } from "@/lib/axios/renderSafeError";

// The answers that mean "there is nothing here for this customer": a bad or
// unknown id, a workspace they are not a member of, a session that ended.
// Only these read as empty, as the pages always assumed.
const NOTHING_HERE = new Set([400, 401, 403, 404]);

// What a reader does when its request fails. Anything outside NOTHING_HERE --
// a 5xx, a 429 from the throttle, a timeout, no answer at all -- is thrown,
// so the page shows its error screen with "Try again" rather than "no
// transactions yet", which would be untrue.
export function emptyUnlessOutage<T>(error: unknown, empty: T): T {
  if (isAxiosError(error) && error.response && NOTHING_HERE.has(error.response.status)) {
    return empty;
  }
  logServiceError("Error reading from the API", error);
  // Into the page's render: never the AxiosError and the token it carries.
  throw toRenderSafeError(error);
}
