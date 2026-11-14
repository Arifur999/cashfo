import MemberSignInForm from "@/components/modules/Auth/MemberSignInForm";
import { publicPageTitle } from "@/components/modules/Legal/publicPageTitle";
import { ACCESS_CHANGED_REASON } from "@/lib/authUtils";

export const generateMetadata = publicPageTitle("Group member log in");

// Group Expense's member portal sign-in (the GroupLogin board). The (auth)
// layout draws its frame; ?reason=access-changed says why a member's login
// was signed out (proxy.ts cleared its cookies on the way in).
const GroupLoginPage = async ({ searchParams }: PageProps<"/group-login">) => {
  const { reason } = await searchParams;
  return <MemberSignInForm accessChanged={reason === ACCESS_CHANGED_REASON} />;
};

export default GroupLoginPage;
