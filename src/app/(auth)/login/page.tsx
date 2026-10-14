import type { Metadata } from "next";
import AuthFooterPrompt from "@/components/modules/Auth/AuthFooterPrompt";
import AuthHeading from "@/components/modules/Auth/AuthHeading";
import AuthShell from "@/components/modules/Auth/AuthShell";
import GoogleSignInButton from "@/components/modules/Auth/GoogleSignInButton";
import LoginForm from "@/components/modules/Auth/LoginForm";
import MaintenanceNotice from "@/components/modules/Auth/MaintenanceNotice";
import RenameNotice from "@/components/modules/Auth/RenameNotice";
import SignInNotices from "@/components/modules/Auth/SignInNotices";
import OrDivider from "@/components/shared/OrDivider";
import { REGISTER_ROUTE, SESSION_EXPIRED_REASON } from "@/lib/authUtils";
import { getSignInErrorMessage } from "@/lib/signInErrors";

export const metadata: Metadata = {
  title: "Sign in",
};

const param = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

// One sign-in page for the whole site: admins land in the admin panel,
// customers in the app. After a session ends it says so and brings the
// customer back to the page they were on.
const LoginPage = async ({ searchParams }: PageProps<"/login">) => {
  const { redirect, reason, error } = await searchParams;
  const redirectTo = param(redirect);
  const sessionExpired = reason === SESSION_EXPIRED_REASON;

  return (
    <AuthShell hero={sessionExpired ? "narrow" : "login"} notice={<MaintenanceNotice />}>
      {sessionExpired ? (
        <AuthHeading title="You've been signed out" subtitle="Sign in again and we will take you back to the page you were on." />
      ) : (
        <AuthHeading title="Welcome back" subtitle="Sign in to Smartly to pick up where you left off." />
      )}
      <SignInNotices sessionExpired={sessionExpired} signInError={getSignInErrorMessage(param(error))} />
      {!sessionExpired && <RenameNotice />}
      <LoginForm redirectTo={redirectTo} />
      <OrDivider />
      <GoogleSignInButton redirectTo={redirectTo} />
      <AuthFooterPrompt prompt="New to Smartly?" linkLabel="Create an account" href={REGISTER_ROUTE} />
    </AuthShell>
  );
};

export default LoginPage;
