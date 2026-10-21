import { unstable_isUnrecognizedActionError, unstable_rethrow } from "next/navigation";

// What a save says when it never reached the server. English, like any
// action's message: callers show it through t().
export const OFFLINE_MESSAGE = "No connection. Nothing was saved; try again.";
// What it says when the page is from an older build than the server.
export const STALE_MESSAGE = "Smartly was just updated. Reload the page and try again.";

// A server action that can't reach the server (offline, a dropped line)
// rejects instead of answering { success: false }. Thrown inside a
// transition, that lands on the route's error screen and loses the open
// drawer's entry; this reads it as one more failed answer instead, so the
// caller says so and keeps the drawer open. Next's own redirect and
// not-found still go through. `offline` replaces the message, for a caller
// that shows it as it is (already in the reader's words); `stale` likewise.
export async function attempt<R extends { success: boolean; message?: string }>(action: () => Promise<R>, offline: string = OFFLINE_MESSAGE, stale: string = STALE_MESSAGE): Promise<R | { success: false; message: string; data?: undefined }> {
  try {
    return await action();
  } catch (error) {
    unstable_rethrow(error);
    // A page open across a deploy calls actions the new build doesn't have: a reload helps, a retry can't.
    if (unstable_isUnrecognizedActionError(error)) return { success: false, message: stale };
    return { success: false, message: offline };
  }
}
