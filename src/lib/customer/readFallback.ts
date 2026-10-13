import { isAxiosError } from "axios";
import { logServiceError } from "@/lib/axios/logServiceError";
import { toRenderSafeError } from "@/lib/axios/renderSafeError";

// What a reader does when its request fails. A 4xx is the backend answering
// that there is nothing here for this customer (not found, not a member,
// signed out) and reads as empty, as the pages always assumed. A 5xx or no
// answer at all is an outage, and is thrown: the page shows its error screen
// with "Try again" rather than "no transactions yet", which would be untrue.
export function emptyUnlessOutage<T>(error: unknown, empty: T): T {
  if (isAxiosError(error) && error.response && error.response.status < 500) {
    return empty;
  }
  logServiceError("Error reading from the API", error);
  // Into the page's render: never the AxiosError and the token it carries.
  throw toRenderSafeError(error);
}
