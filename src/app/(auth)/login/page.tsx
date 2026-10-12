import type { Metadata } from "next";
import AuthFooterPrompt from "@/components/modules/Auth/AuthFooterPrompt";
import AuthHeading from "@/components/modules/Auth/AuthHeading";
import GoogleSignInButton from "@/components/modules/Auth/GoogleSignInButton";
import LoginForm from "@/components/modules/Auth/LoginForm";
import SignInNotices from "@/components/modules/Auth/SignInNotices";
import OrDivider from "@/components/shared/OrDivider";
import { REGISTER_ROUTE, SESSION_EXPIRED_REASON } from "@/lib/authUtils";
import { getSignInErrorMessage } from "@/lib/signInErrors";

export const metadata: Metadata = {
  title: "Sign in",
};

const param = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

// One sign-in page for the whole site: admins land in the admin panel,
// customers in the app.
const LoginPage = async ({ searchParams }: PageProps<"/login">) => {
  const { redirect, reason, error } = await searchParams;
  const redirectTo = param(redirect);

  return (
    <>
      <AuthHeading title="Welcome back" subtitle="Sign in to your account" />
      <SignInNotices sessionExpired={reason === SESSION_EXPIRED_REASON} signInError={getSignInErrorMessage(param(error))} />
      <GoogleSignInButton redirectTo={redirectTo} />
      <OrDivider />
      <LoginForm redirectTo={redirectTo} />
      <AuthFooterPrompt prompt="Don't have an account?" linkLabel="Create one" href={REGISTER_ROUTE} />
    </>
  );
};

export default LoginPage;
