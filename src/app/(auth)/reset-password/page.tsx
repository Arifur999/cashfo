import ResetPasswordFlow from "@/components/modules/Auth/ResetPasswordFlow";
import { publicPageTitle } from "@/components/modules/Legal/publicPageTitle";
import { getResetLinkStatus } from "@/services/passwordReset.services";

export const generateMetadata = publicPageTitle("Choose a new password");

// Opened from the reset email: /reset-password?token=... A link that can no
// longer work says so first, before the new password is typed twice; one
// whose owner asked for an emailed code too asks for it with the password.
const ResetPasswordPage = async ({ searchParams }: PageProps<"/reset-password">) => {
  const { token } = await searchParams;
  const resetToken = typeof token === "string" ? token.trim() : "";
  const { status, codeRequired } = resetToken ? await getResetLinkStatus(resetToken) : { status: "incomplete" as const, codeRequired: false };

  return <ResetPasswordFlow token={resetToken} status={status} codeRequired={codeRequired} />;
};

export default ResetPasswordPage;
