import type { Metadata } from "next";
import AuthFooterPrompt from "@/components/modules/Auth/AuthFooterPrompt";
import AuthHeading from "@/components/modules/Auth/AuthHeading";
import AuthShell from "@/components/modules/Auth/AuthShell";
import GoogleSignInButton from "@/components/modules/Auth/GoogleSignInButton";
import InviteCodeNotice from "@/components/modules/Auth/InviteCodeNotice";
import MaintenanceNotice from "@/components/modules/Auth/MaintenanceNotice";
import RegisterForm from "@/components/modules/Auth/RegisterForm";
import OrDivider from "@/components/shared/OrDivider";
import { LOGIN_ROUTE } from "@/lib/authUtils";

export const metadata: Metadata = {
  title: "Create an account",
};

const RegisterPage = async ({ searchParams }: PageProps<"/register">) => {
  const { ref } = await searchParams;
  const referralCode = typeof ref === "string" && ref.trim() ? ref.trim() : undefined;

  return (
    <AuthShell hero="register" notice={<MaintenanceNotice />}>
      <AuthHeading title="Create your account" subtitle="One account for your money, habits and passwords." size="compact" />
      {referralCode && <InviteCodeNotice code={referralCode} />}
      <RegisterForm referralCode={referralCode} />
      <OrDivider />
      <GoogleSignInButton referralCode={referralCode} label="Sign up with Google" />
      <AuthFooterPrompt prompt="Already have an account?" linkLabel="Sign in" href={LOGIN_ROUTE} />
    </AuthShell>
  );
};

export default RegisterPage;
