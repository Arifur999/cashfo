import AuthFooterPrompt from "@/components/modules/Auth/AuthFooterPrompt";
import AuthHeading from "@/components/modules/Auth/AuthHeading";
import ResetLinkProblem from "@/components/modules/Auth/ResetLinkProblem";
import ResetPasswordForm from "@/components/modules/Auth/ResetPasswordForm";
import { publicPageTitle } from "@/components/modules/Legal/publicPageTitle";
import { LOGIN_ROUTE } from "@/lib/authUtils";
import { getResetLinkStatus } from "@/services/passwordReset.services";

export const generateMetadata = publicPageTitle("Choose a new password");

// Opened from the reset email: /reset-password?token=... A link that can no
// longer work says so first, before the new password is typed twice.
const ResetPasswordPage = async ({ searchParams }: PageProps<"/reset-password">) => {
  const { token } = await searchParams;
  const resetToken = typeof token === "string" ? token.trim() : "";
  if (!resetToken) {
    return <ResetLinkProblem reason="incomplete" />;
  }
  if ((await getResetLinkStatus(resetToken)) === "invalid") {
    return <ResetLinkProblem reason="expired" />;
  }

  return (
    <>
      <AuthHeading title="Choose a new password" subtitle="Pick something you have not used on Smartly before." />
      <ResetPasswordForm token={resetToken} />
      <AuthFooterPrompt prompt="Remembered it?" linkLabel="Back to sign in" href={LOGIN_ROUTE} />
    </>
  );
};

export default ResetPasswordPage;
