import { redirect } from "next/navigation";
import { getCurrentAdmin } from "./adminAuth";

// The Security & Audit module is SUPER_ADMIN only (see security.module.ts on
// the backend) -- hiding the sidebar link isn't enough, since a non-SUPER
// admin could still navigate to /admin/security/* directly and hit a raw
// axios 403 inside a Server Component render. Call this first in every
// security page so that instead crashes into a clean redirect.
export async function requireSuperAdmin() {
  const admin = await getCurrentAdmin();
  if (admin?.role !== "SUPER_ADMIN") {
    redirect("/admin/dashboard");
  }
  return admin;
}
