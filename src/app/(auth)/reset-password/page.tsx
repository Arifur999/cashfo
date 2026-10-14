import type { Metadata } from "next";
import AuthFooterPrompt from "@/components/modules/Auth/AuthFooterPrompt";
import AuthHeading from "@/components/modules/Auth/AuthHeading";
import AuthShell from "@/components/modules/Auth/AuthShell";
import IncompleteResetLink from "@/components/modules/Auth/IncompleteResetLink";
import MaintenanceNotice from "@/components/modules/Auth/MaintenanceNotice";
import ResetPasswordForm from "@/components/modules/Auth/ResetPasswordForm";
import { LOGIN_ROUTE } from "@/lib/authUtils";

export const metadata: Metadata = {
  title: "Choose a new password",
};

// Opened from the reset email: /reset-password?token=...
const ResetPasswordPage = async ({ searchParams }: PageProps<"/reset-password">) => {
  const { token } = await searchParams;

  return (
    <AuthShell hero="narrow" notice={<MaintenanceNotice />}>
      {typeof token !== "string" || !token.trim() ? (
        <IncompleteResetLink />
      ) : (
        <>
          <AuthHeading title="Choose a new password" subtitle="Pick something you have not used on Smartly before." />
          <ResetPasswordForm token={token.trim()} />
          <AuthFooterPrompt prompt="Remembered it?" linkLabel="Back to sign in" href={LOGIN_ROUTE} />
        </>
      )}
    </AuthShell>
  );
};

export default ResetPasswordPage;
