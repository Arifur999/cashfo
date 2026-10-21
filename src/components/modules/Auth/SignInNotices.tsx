"use client";

import { Clock, CircleAlert } from "lucide-react";
import Banner from "@/components/smartly/Banner";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface SignInNoticesProps {
  sessionExpired?: boolean;
  // Why the last sign-in attempt (Google) bounced back here, if it did.
  signInError?: string;
}

// What the login (or sign-up) page says before anything is typed: a session
// that ended, or a Google sign-in that didn't finish. Marked as a notice, so
// the phone hero card makes room for it.
const SignInNotices = ({ sessionExpired = false, signInError }: SignInNoticesProps) => {
  const { translate } = useLocale();

  if (signInError) {
    return (
      <Banner tone="danger" inline role="alert" icon={<CircleAlert />} className="font-normal" data-auth-notice="">
        {translate(signInError)}
      </Banner>
    );
  }
  if (sessionExpired) {
    return (
      <Banner tone="info" inline icon={<Clock />} className="font-normal" data-auth-notice="">
        {translate("For your safety we sign you out after a long time away, after a password change, or when Sign out everywhere else is used on another device.")}
      </Banner>
    );
  }
  return null;
};

export default SignInNotices;
