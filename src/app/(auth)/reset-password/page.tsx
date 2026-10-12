import type { Metadata } from "next";
import AuthFooterPrompt from "@/components/modules/Auth/AuthFooterPrompt";
import AuthHeading from "@/components/modules/Auth/AuthHeading";
import IncompleteResetLink from "@/components/modules/Auth/IncompleteResetLink";
import ResetPasswordForm from "@/components/modules/Auth/ResetPasswordForm";
import { LOGIN_ROUTE } from "@/lib/authUtils";

export const metadata: Metadata = {
  title: "Choose a new password",
};

// Opened from the reset email: /reset-password?token=...
const ResetPasswordPage = async ({ searchParams }: PageProps<"/reset-password">) => {
  const { token } = await searchParams;

  if (typeof token !== "string" || !token.trim()) {
    return <IncompleteResetLink />;
  }

  return (
    <>
      <AuthHeading title="Choose a new password" subtitle="You'll use it from now on. Every other device will be signed out." />
      <ResetPasswordForm token={token.trim()} />
      <AuthFooterPrompt prompt="Remembered it?" linkLabel="Back to sign in" href={LOGIN_ROUTE} />
    </>
  );
};

export default ResetPasswordPage;
