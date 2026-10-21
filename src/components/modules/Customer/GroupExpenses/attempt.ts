// A server action that can't reach the server (offline, a dropped line)
// throws instead of returning its { success: false }. Thrown inside a
// transition, that would land on the route's error screen and lose the
// open drawer's entry; this turns it into a failed result instead, so the
// caller toasts and keeps the drawer open.
export async function attempt<R extends { success: boolean; message?: string }>(action: () => Promise<R>, offline: string): Promise<R | { success: false; message: string; data?: undefined }> {
  try {
    return await action();
  } catch {
    return { success: false, message: offline };
  }
}
