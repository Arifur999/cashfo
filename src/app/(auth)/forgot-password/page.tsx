import type { Metadata } from "next";
import AuthFooterPrompt from "@/components/modules/Auth/AuthFooterPrompt";
import ForgotPasswordForm from "@/components/modules/Auth/ForgotPasswordForm";
import { LOGIN_ROUTE } from "@/lib/authUtils";

export const metadata: Metadata = {
  title: "Reset your password",
};

export default function ForgotPasswordPage() {
  return (
    <>
      <ForgotPasswordForm />
      <AuthFooterPrompt prompt="Remembered it?" linkLabel="Back to sign in" href={LOGIN_ROUTE} />
    </>
  );
}
