"use client";

import { useState } from "react";
import Callout from "@/components/shared/Callout";
import { Button } from "@/components/ui/button";
import { GOOGLE_SIGN_IN_ROUTE, LOGIN_ROUTE } from "@/lib/authUtils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import GoogleIcon from "./GoogleIcon";

interface GoogleSignInButtonProps {
  // Where to go once signed in; GOOGLE_SIGN_IN_ROUTE checks it is allowed.
  redirectTo?: string;
  // An invite code from the sign-up link (?ref=), credited to whoever
  // invited them if this creates the account.
  referralCode?: string;
}

// Starts Google sign-in on better-auth (through this origin's /api/auth)
// and hands the browser to Google. better-auth brings it back to
// GOOGLE_SIGN_IN_ROUTE, or to the login page with ?error= if it fails.
// requestSignUp: a Google address with no account yet gets a customer
// account -- signing in and signing up are the same button.
const GoogleSignInButton = ({ redirectTo, referralCode }: GoogleSignInButtonProps) => {
  const { translate } = useLocale();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setIsPending(true);
    setError(null);
    // Both survive the trip through Google as the landing page's query.
    const landing = new URLSearchParams();
    if (redirectTo) landing.set("redirect", redirectTo);
    if (referralCode) landing.set("ref", referralCode);
    const callbackURL = landing.size > 0 ? `${GOOGLE_SIGN_IN_ROUTE}?${landing.toString()}` : GOOGLE_SIGN_IN_ROUTE;
    try {
      const response = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google", callbackURL, errorCallbackURL: LOGIN_ROUTE, requestSignUp: true }),
      });
      const data: { url?: string } = await response.json();
      if (!response.ok || !data.url) {
        throw new Error("Google sign-in did not start");
      }
      window.location.assign(data.url);
    } catch {
      setError("Google sign-in isn't available right now. Use your email and password.");
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" size="lg" className="w-full gap-2.5" onClick={signIn} disabled={isPending} aria-busy={isPending}>
        <GoogleIcon className="size-4" aria-hidden="true" />
        {translate(isPending ? "Opening Google..." : "Continue with Google")}
      </Button>
      {error && (
        <Callout variant="danger" role="alert">
          {translate(error)}
        </Callout>
      )}
    </div>
  );
};

export default GoogleSignInButton;
