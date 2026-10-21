import AuthFooterPrompt from "@/components/modules/Auth/AuthFooterPrompt";
import AuthHeading from "@/components/modules/Auth/AuthHeading";
import GoogleSignInButton from "@/components/modules/Auth/GoogleSignInButton";
import LoginForm from "@/components/modules/Auth/LoginForm";
import RenameNotice from "@/components/modules/Auth/RenameNotice";
import SignInNotices from "@/components/modules/Auth/SignInNotices";
import { publicPageTitle } from "@/components/modules/Legal/publicPageTitle";
import OrDivider from "@/components/shared/OrDivider";
import { REGISTER_ROUTE, SESSION_EXPIRED_REASON } from "@/lib/authUtils";
import { getSignInErrorMessage } from "@/lib/signInErrors";

export const generateMetadata = publicPageTitle("Sign in");

const param = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

// One sign-in page for the whole site: admins land in the admin panel,
// customers in the app. After a session ends it says so, and with a
// ?redirect= target brings them back to the page they were on. The (auth)
// layout draws the frame around it.
const LoginPage = async ({ searchParams }: PageProps<"/login">) => {
  const { redirect, reason, error } = await searchParams;
  const redirectTo = param(redirect);
  const sessionExpired = reason === SESSION_EXPIRED_REASON;

  return (
    <>
      {sessionExpired ? (
        // Only promise the way back when there is a page to go back to.
        <AuthHeading title="You've been signed out" subtitle={redirectTo ? "Sign in again and we will take you back to the page you were on." : "Sign in again to carry on."} />
      ) : (
        <AuthHeading title="Welcome back" subtitle="Sign in to Smartly to pick up where you left off." />
      )}
      <SignInNotices sessionExpired={sessionExpired} signInError={getSignInErrorMessage(param(error))} />
      <LoginForm redirectTo={redirectTo} again={sessionExpired} />
      <OrDivider />
      <GoogleSignInButton redirectTo={redirectTo} />
      {!sessionExpired && <AuthFooterPrompt prompt="Don't have an account?" widePrompt="New to Smartly?" linkLabel="Create an account" href={REGISTER_ROUTE} />}
      {/* Under the form, so a phone shows the fields first. */}
      {!sessionExpired && <RenameNotice />}
    </>
  );
};

export default LoginPage;
