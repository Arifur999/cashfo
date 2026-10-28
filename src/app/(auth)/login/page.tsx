import SignInFlow from "@/components/modules/Auth/SignInFlow";
import { publicPageTitle } from "@/components/modules/Legal/publicPageTitle";
import { SESSION_EXPIRED_REASON } from "@/lib/authUtils";
import { getSignInStep } from "@/lib/tokenUtils";
import { getSignInErrorMessage } from "@/lib/signInErrors";

export const generateMetadata = publicPageTitle("Sign in");

const param = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

// One sign-in page for the whole site: admins land in the admin panel,
// customers in the app. After a session ends it says so, and with a
// ?redirect= target brings them back to the page they were on. A Google
// sign-in with two-step on comes back here at the code (?step=two-step).
// The (auth) layout draws the frame around it.
const LoginPage = async ({ searchParams }: PageProps<"/login">) => {
  const { redirect, reason, error, step } = await searchParams;
  const waiting = step === "two-step" ? await getSignInStep() : null;

  return (
    <SignInFlow
      redirectTo={param(redirect)}
      sessionExpired={reason === SESSION_EXPIRED_REASON}
      signInError={getSignInErrorMessage(param(error))}
      initialStep={waiting && { kind: waiting.kind, email: waiting.email, audience: waiting.audience }}
    />
  );
};

export default LoginPage;
