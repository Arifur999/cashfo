"use client";

import { toast } from "sonner";
import { downloadBlob } from "@/lib/download";
import type { Translate } from "@/lib/i18n/message";

// "Download a copy": the customer's own data export (a zip), through the
// admin route that passes it on (app/(dashboardLayout)/admin/users/[id]/
// export). Resolves true once the file is saved; says why it wasn't.
export async function downloadOwnerCopy(userId: string, t: Translate): Promise<boolean> {
  let response: Response;
  try {
    response = await fetch(`/admin/users/${encodeURIComponent(userId)}/export`, { cache: "no-store" });
  } catch {
    toast.error(t("Unable to reach the server. Please try again."));
    return false;
  }
  if (!response.ok) {
    toast.error(
      t(
        response.status === 403
          ? "Only a super admin can download a copy of someone's data."
          : response.status === 429
            ? "Too many downloads. Wait a minute and try again."
            : "Couldn't make the copy. Try again in a moment.",
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
