"use client";

import { useCallback, useState } from "react";
import OrDivider from "@/components/shared/OrDivider";
import { REGISTER_ROUTE } from "@/lib/authUtils";
import type { SignInStepView } from "@/lib/completeSignIn";
import type { AuthAlertTone } from "./AuthAlert";
import AuthFooterPrompt from "./AuthFooterPrompt";
import AuthHeading from "./AuthHeading";
import GoogleSignInButton from "./GoogleSignInButton";
import LoginForm from "./LoginForm";
import TwoStepCodeForm from "./TwoStepCodeForm";
import TwoStepSetupForm from "./TwoStepSetupForm";

interface SignInFlowProps {
  redirectTo?: string;
  // The session ended (?reason=session-expired).
  sessionExpired?: boolean;
  // Why a Google sign-in came back here, in words.
  signInError?: string;
  // A step already waiting: a Google sign-in with two-step on lands here
  // at its code (?step=two-step).
  initialStep?: SignInStepView | null;
}

// The one sign-in page for the whole site: email and password (or Google),
// then -- with two-step sign-in on -- the code from the authenticator app,
// or for an admin who has to, setting it up. The page keeps this component
// through a re-render, so the step it is on stays put.
const SignInFlow = ({ redirectTo, sessionExpired = false, signInError, initialStep = null }: SignInFlowProps) => {
  const [step, setStep] = useState<SignInStepView | null>(initialStep);
  // What the form says when a step sends the person back to it.
  const [backNotice, setBackNotice] = useState<string | null>(null);

  const back = useCallback((message?: string) => {
    setBackNotice(message ?? null);
    setStep(null);
  }, []);

  if (step?.kind === "code") return <TwoStepCodeForm email={step.email} audience={step.audience} onBack={back} />;
  if (step?.kind === "setup") return <TwoStepSetupForm email={step.email} onBack={back} />;

  const notice: { tone: AuthAlertTone; message: string } | null = backNotice
    ? { tone: "error", message: backNotice }
    : signInError
      ? { tone: "error", message: signInError }
      : sessionExpired
        ? { tone: "info", message: "Your session ended, so you were signed out. Sign in again to carry on where you were." }
        : null;

  return (
    <>
      <AuthHeading title="Welcome back" subtitle="Sign in to your account to continue." />
      <div className="flex flex-col gap-4">
        <LoginForm redirectTo={redirectTo} notice={notice} onStep={setStep} />
        <OrDivider />
        <GoogleSignInButton redirectTo={redirectTo} size="lg" className="text-[15px] max-md:h-12 max-md:text-body-lg" />
      </div>
      <AuthFooterPrompt prompt="Don't have an account?" linkLabel="Create an account" href={REGISTER_ROUTE} />
    </>
  );
};

export default SignInFlow;
