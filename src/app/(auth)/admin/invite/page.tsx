import AdminInviteFlow from "@/components/modules/Auth/AdminInviteFlow";
import { publicPageTitle } from "@/components/modules/Legal/publicPageTitle";
import { checkAdminInvite } from "@/services/accountAccess.services";

export const generateMetadata = publicPageTitle("Join the admin team");

// Opened from an invite email: /admin/invite?token=... Public (proxy.ts
// lets it through without a session); the (auth) layout draws it in the
// admin panel's frame.
const AdminInvitePage = async ({ searchParams }: PageProps<"/admin/invite">) => {
  const { token } = await searchParams;
  const inviteToken = typeof token === "string" ? token.trim() : "";
  const check = inviteToken ? await checkAdminInvite(inviteToken).catch(() => null) : null;
  return <AdminInviteFlow token={inviteToken} check={check} />;
};

export default AdminInvitePage;
