"use client";

import { useState } from "react";
import Callout from "@/components/shared/Callout";
import { Button } from "@/components/ui/button";
import { GOOGLE_SIGN_IN_ROUTE, LOGIN_ROUTE } from "@/lib/authUtils";
import GoogleIcon from "./GoogleIcon";

// Starts Google sign-in on better-auth (through this origin's /api/auth)
// and hands the browser to Google. better-auth brings it back to
// GOOGLE_SIGN_IN_ROUTE, or to the login page with ?error= if it fails.
// No requestSignUp: this button signs existing accounts in, never creates one.
const GoogleSignInButton = () => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setIsPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google", callbackURL: GOOGLE_SIGN_IN_ROUTE, errorCallbackURL: LOGIN_ROUTE }),
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
      <Button type="button" variant="outline" size="lg" className="w-full" onClick={signIn} disabled={isPending}>
        <GoogleIcon className="size-4" aria-hidden="true" />
        {isPending ? "Opening Google..." : "Continue with Google"}
      </Button>
      {error && (
        <Callout variant="danger" role="alert">
          {error}
        </Callout>
      )}
    </div>
  );
};

export default GoogleSignInButton;
