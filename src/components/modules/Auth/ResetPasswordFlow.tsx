"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { LOGIN_ROUTE } from "@/lib/authUtils";
import type { SignInStepView } from "@/lib/completeSignIn";
import AuthFooterPrompt from "./AuthFooterPrompt";
import AuthHeading from "./AuthHeading";
import ResetLinkProblem from "./ResetLinkProblem";
import ResetPasswordForm from "./ResetPasswordForm";
import TwoStepCodeForm from "./TwoStepCodeForm";

interface ResetPasswordFlowProps {
  token: string;
  // What the link check said when the page opened.
  status: "valid" | "invalid" | "unknown" | "incomplete";
  codeRequired: boolean;
}

// /reset-password: the new password -- with the emailed code when the
// customer asked for one -- and, with two-step sign-in on, the code from the
// authenticator app to sign in. The link check is taken once, as the page
// opened: a re-render after the password is saved finds the link used, and
// must not swap the code step for "this link no longer works".
const ResetPasswordFlow = ({ token, status, codeRequired }: ResetPasswordFlowProps) => {
  const router = useRouter();
  const [opened] = useState(() => ({ status, codeRequired }));
  const [step, setStep] = useState<SignInStepView | null>(null);

  // The step ended or was left: the password is changed, so signing in
  // starts afresh with it.
  const back = useCallback(() => router.push(`${LOGIN_ROUTE}?error=password_changed`), [router]);

  if (step) return <TwoStepCodeForm email={step.email} audience={step.audience} onBack={back} />;
  if (opened.status === "incomplete") return <ResetLinkProblem reason="incomplete" />;
  if (opened.status === "invalid") return <ResetLinkProblem reason="expired" />;

  return (
    <>
      <AuthHeading title="Choose a new password" subtitle="Pick something you have not used on Smartly before." />
      <ResetPasswordForm token={token} codeRequired={opened.codeRequired} onStep={setStep} />
      <AuthFooterPrompt prompt="Remembered it?" linkLabel="Back to sign in" href={LOGIN_ROUTE} />
    </>
  );
};

export default ResetPasswordFlow;
