"use client";

import { CircleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import Banner from "@/components/smartly/Banner";
import Button, { type ButtonProps } from "@/components/smartly/Button";
import { GOOGLE_SIGN_IN_ROUTE } from "@/lib/authUtils";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import GoogleIcon from "./GoogleIcon";

interface GoogleSignInButtonProps {
  // Where to go once signed in; GOOGLE_SIGN_IN_ROUTE checks it is allowed.
  redirectTo?: string;
  // An invite code (?ref= or typed on sign-up), credited to whoever invited
  // them if this creates the account.
  referralCode?: string;
  // "Continue with Google" on sign-in, "Sign up with Google" on sign-up.
  label?: string;
  // Sign-up matches its 44px Create account button; sign-in keeps 52px.
  size?: ButtonProps["size"];
  className?: string;
  // Sign-up paused for maintenance: the button matches the closed form.
  disabled?: boolean;
}

// The page Google sends a cancelled or failed sign-in back to: this one,
// with its ?redirect= and invite code, without the last attempt's ?error=
// (better-auth adds a fresh one).
const errorReturnPath = (referralCode?: string) => {
  const here = new URL(window.location.href);
  here.searchParams.delete("error");
  here.searchParams.delete("error_description");
  if (referralCode) here.searchParams.set("ref", referralCode);
  return `${here.pathname}${here.search}`;
};

// Starts Google sign-in on better-auth (through this origin's /api/auth)
// and hands the browser to Google. better-auth brings it back to
// GOOGLE_SIGN_IN_ROUTE, or to the page it started on with ?error= if it
// fails. requestSignUp: a Google address with no account yet gets a customer
// account -- signing in and signing up are the same button.
const GoogleSignInButton = ({ redirectTo, referralCode, label = "Continue with Google", size = "2xl", className, disabled = false }: GoogleSignInButtonProps) => {
  const { translate } = useLocale();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Back from Google's page, Safari and Chrome may restore this one from
  // their back/forward cache exactly as it was left: "Opening Google...".
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) setIsPending(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

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
        body: JSON.stringify({ provider: "google", callbackURL, errorCallbackURL: errorReturnPath(referralCode), requestSignUp: true }),
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
    <div className="flex flex-col gap-3">
      <Button type="button" variant="secondary" size={size} className={cn("w-full gap-3 font-semibold", className)} onClick={signIn} disabled={isPending || disabled} aria-busy={isPending}>
        <GoogleIcon className="size-4.5" aria-hidden="true" />
        {translate(isPending ? "Opening Google..." : label)}
      </Button>
      {error && (
        <Banner tone="danger" inline role="alert" icon={<CircleAlert />} className="font-normal">
          {translate(error)}
        </Banner>
      )}
    </div>
  );
};

export default GoogleSignInButton;
