import AdminResetPasswordFlow from "@/components/modules/Auth/AdminResetPasswordFlow";
import { publicPageTitle } from "@/components/modules/Legal/publicPageTitle";
import { checkAdminResetLink } from "@/services/accountAccess.services";

export const generateMetadata = publicPageTitle("Choose a new password");

// Opened from an admin's reset email: /admin/reset-password?token=...
// Public (proxy.ts lets it through without a session); the (auth) layout
// draws it in the admin panel's frame.
const AdminResetPasswordPage = async ({ searchParams }: PageProps<"/admin/reset-password">) => {
  const { token } = await searchParams;
  const resetToken = typeof token === "string" ? token.trim() : "";
  if (!resetToken) return <AdminResetPasswordFlow token="" status="incomplete" />;
  // No answer: show the form, and saving checks the link anyway.
  const check = await checkAdminResetLink(resetToken).catch(() => null);
  return <AdminResetPasswordFlow token={resetToken} status={check === null ? "unknown" : check.valid ? "valid" : "invalid"} />;
};

export default AdminResetPasswordPage;
