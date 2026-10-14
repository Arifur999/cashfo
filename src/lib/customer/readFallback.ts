import { isAxiosError } from "axios";
import { redirect } from "next/navigation";
import { CUSTOMER_HOME_ROUTE, MAINTENANCE_ROUTE, unlockWorkspaceRoute } from "@/lib/authUtils";
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
  // Maintenance mode (Admin > Settings) closes the customer API with a 503
  // that says so: show the maintenance page, not the error screen.
  if (isAxiosError(error) && error.response?.status === 503 && (error.response.data as { maintenance?: boolean } | undefined)?.maintenance) {
    redirect(MAINTENANCE_ROUTE);
  }
  // A PIN-locked workspace this device has no (or an outdated) unlock for:
  // its PIN screen.
  if (isAxiosError(error) && error.response?.status === 423) {
    const businessId = (error.response.data as { businessId?: unknown } | undefined)?.businessId;
    redirect(typeof businessId === "string" ? unlockWorkspaceRoute(businessId) : CUSTOMER_HOME_ROUTE);
  }
  logServiceError("Error reading from the API", error);
  // Into the page's render: never the AxiosError and the token it carries.
  throw toRenderSafeError(error);
}
