import type { Metadata } from "next";
import AuthFooterPrompt from "@/components/modules/Auth/AuthFooterPrompt";
import AuthHeading from "@/components/modules/Auth/AuthHeading";
import GoogleSignInButton from "@/components/modules/Auth/GoogleSignInButton";
import InviteCodeNotice from "@/components/modules/Auth/InviteCodeNotice";
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
    <>
      <AuthHeading title="Create your account" subtitle="Start managing your money in minutes" />
      {referralCode && <InviteCodeNotice code={referralCode} />}
      <GoogleSignInButton />
      <OrDivider />
      <RegisterForm referralCode={referralCode} />
      <AuthFooterPrompt prompt="Already have an account?" linkLabel="Sign in" href={LOGIN_ROUTE} />
    </>
  );
};

export default RegisterPage;
