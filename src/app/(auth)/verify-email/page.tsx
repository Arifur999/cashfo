import VerifyEmailFlow from "@/components/modules/Auth/VerifyEmailFlow";
import { publicPageTitle } from "@/components/modules/Legal/publicPageTitle";
import { checkEmailVerification } from "@/services/accountAccess.services";

export const generateMetadata = publicPageTitle("Confirm your email");

// Opened from the verification email: /verify-email?token=... The link is
// checked (not used) here; the page's button confirms it.
const VerifyEmailPage = async ({ searchParams }: PageProps<"/verify-email">) => {
  const { token } = await searchParams;
  const verifyToken = typeof token === "string" ? token.trim() : "";
  if (!verifyToken) return <VerifyEmailFlow token="" status="incomplete" />;

  // No answer (a slow API, maintenance): the button tries anyway, and says
  // what went wrong.
  const check = await checkEmailVerification(verifyToken).catch(() => null);
  const status = check === null ? "unknown" : check.valid ? "valid" : "invalid";
  return <VerifyEmailFlow token={verifyToken} status={status} email={check?.email} />;
};

export default VerifyEmailPage;
