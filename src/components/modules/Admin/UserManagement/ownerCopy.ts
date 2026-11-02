"use client";

import { toast } from "sonner";
import { downloadBlob } from "@/lib/download";
import type { Translate } from "@/lib/i18n/message";

// "Download a copy": the customer's own data export (a zip), through the
// admin route that passes it on (app/(dashboardLayout)/admin/users/[id]/
// export), with the support code the customer made. Resolves true once the
// file is saved; says why it wasn't (a wrong or missing code in the API's
// own words).
export async function downloadOwnerCopy(userId: string, code: string, t: Translate): Promise<boolean> {
  let response: Response;
  try {
    response = await fetch(`/admin/users/${encodeURIComponent(userId)}/export`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }), cache: "no-store" });
  } catch {
    toast.error(t("Unable to reach the server. Please try again."));
    return false;
  }
  if (!response.ok) {
    const reason = response.status === 403 ? ((await response.json().catch(() => null)) as { message?: string } | null)?.message : undefined;
    toast.error(
      t(
        reason ??
          (response.status === 403
            ? "Only a super admin can download a copy of someone's data."
            : response.status === 429
              ? "Too many tries. Wait a few minutes and try again."
              : "Couldn't make the copy. Try again in a moment."),
      ),
    );
    return false;
  }
  const disposition = response.headers.get("content-disposition") ?? "";
  const fileName = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? `user-${userId}.zip`;
  downloadBlob(await response.blob(), fileName);
  toast.success(t("Copy downloaded"));
  return true;
}
