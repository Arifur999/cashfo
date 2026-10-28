import AuthAlert from "@/components/modules/Auth/AuthAlert";
import AuthFooterPrompt from "@/components/modules/Auth/AuthFooterPrompt";
import AuthHeading from "@/components/modules/Auth/AuthHeading";
import { normalizeInviteCode } from "@/components/modules/Auth/authFormError";
import InviteInvitation from "@/components/modules/Auth/InviteInvitation";
import RegisterForm from "@/components/modules/Auth/RegisterForm";
import { publicPageTitle } from "@/components/modules/Legal/publicPageTitle";
import T from "@/components/shared/T";
import { LOGIN_ROUTE } from "@/lib/authUtils";
import { getPublicPlatform } from "@/lib/customer/platform";
import { getReferralInvite } from "@/lib/customer/referrals";
import { getSignInErrorMessage } from "@/lib/signInErrors";

export const generateMetadata = publicPageTitle("Create an account");

// A customer account, from the form or with Google (Register,
// RegisterMobile). A ?ref= invite link fills in the invite code and says
// who invited the visitor and the friend's discount (InviteSignupMobile); a
// Google sign-up that didn't finish comes back here with ?error= and the
// code still on. While Admin > Settings has sign-ups turned off, the page
// says so up front and the form stays closed.
const RegisterPage = async ({ searchParams }: PageProps<"/register">) => {
  const { ref, error } = await searchParams;
  const referralCode = normalizeInviteCode(ref);
  // null when the API couldn't say: the code then goes along as before.
  const [invite, platform] = await Promise.all([referralCode ? getReferralInvite(referralCode) : null, getPublicPlatform()]);
  const signupsClosed = platform.signupsOpen === false;
  const signInError = getSignInErrorMessage(typeof error === "string" ? error : undefined);

  return (
    <>
      {invite?.valid && !signupsClosed && <InviteInvitation invite={invite} />}
      <AuthHeading title="Create your account" subtitle="Start managing your money in minutes." />
      {signupsClosed ? (
        <AuthAlert tone="suspended" role="status">
          <p className="font-semibold">
            <T>New sign-ups are closed for now.</T>
          </p>
          <p>
            <T>If you already have an account, sign in. Please check back soon to create a new one.</T>
          </p>
        </AuthAlert>
      ) : (
        signInError && (
          <AuthAlert tone="error">
            <T>{signInError}</T>
          </AuthAlert>
        )
      )}
      {/* Maintenance refuses sign-up (the layout's notice says so), so the
          form closes itself from that same read before anything is typed. */}
      <RegisterForm referralCode={referralCode} inviteUnknown={invite?.valid === false} signupsClosed={signupsClosed} />
      <AuthFooterPrompt prompt="Already have an account?" linkLabel="Sign in" href={LOGIN_ROUTE} />
    </>
  );
};

export default RegisterPage;
