import AuthFooterPrompt from "@/components/modules/Auth/AuthFooterPrompt";
import AuthHeading from "@/components/modules/Auth/AuthHeading";
import { normalizeInviteCode } from "@/components/modules/Auth/authFormError";
import RegisterForm from "@/components/modules/Auth/RegisterForm";
import SignInNotices from "@/components/modules/Auth/SignInNotices";
import { publicPageTitle } from "@/components/modules/Legal/publicPageTitle";
import { LOGIN_ROUTE } from "@/lib/authUtils";
import { getSignInErrorMessage } from "@/lib/signInErrors";

export const generateMetadata = publicPageTitle("Create an account");

// A customer account, from the form or with Google. A ?ref= invite link
// fills in the invite code; a Google sign-up that didn't finish comes back
// here with ?error= and the code still on.
const RegisterPage = async ({ searchParams }: PageProps<"/register">) => {
  const { ref, error } = await searchParams;

  return (
    <>
      <AuthHeading title="Create your account" subtitle="One account for your money, habits and passwords." size="compact" />
      <SignInNotices signInError={getSignInErrorMessage(typeof error === "string" ? error : undefined)} />
      {/* Maintenance refuses sign-up (the layout's notice says so), so the
          form closes itself from that same read before anything is typed. */}
      <RegisterForm referralCode={normalizeInviteCode(ref)} />
      <AuthFooterPrompt prompt="Already have an account?" linkLabel="Sign in" href={LOGIN_ROUTE} />
    </>
  );
};

export default RegisterPage;
