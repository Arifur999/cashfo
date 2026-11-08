import JoinGroupForm, { JoinLinkGone } from "@/components/modules/Auth/JoinGroupForm";
import { publicPageTitle } from "@/components/modules/Legal/publicPageTitle";
import { getCurrentUser } from "@/lib/customer/auth";
import { getGroupInvite } from "@/lib/customer/groupExpenses";
import { getAccessToken } from "@/lib/tokenUtils";

export const generateMetadata = publicPageTitle("Join a group");

// An access link a group's owner sent (/join/<token>): open to everyone,
// signed in or not (proxy.ts). The link is checked first; a signed-in
// customer may add the group to their account instead of making a login.
const JoinPage = async ({ params }: PageProps<"/join/[token]">) => {
  const { token } = await params;
  const invite = await getGroupInvite(token);
  if (!invite) return <JoinLinkGone />;
  const user = (await getAccessToken()) ? await getCurrentUser() : null;
  return <JoinGroupForm token={token} invite={invite} signedInAs={user ? (user.username ? `${user.name} (${user.username})` : user.name) : null} />;
};

export default JoinPage;
