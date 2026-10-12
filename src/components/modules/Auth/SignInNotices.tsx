"use client";

import Callout from "@/components/shared/Callout";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface SignInNoticesProps {
  sessionExpired?: boolean;
  // Why the last sign-in attempt (Google) bounced back here, if it did.
  signInError?: string;
}

// What the login page says before anything is typed: a session that ended,
// or a Google sign-in that didn't finish.
const SignInNotices = ({ sessionExpired = false, signInError }: SignInNoticesProps) => {
  const { translate } = useLocale();

  if (signInError) {
    return (
      <Callout variant="danger" role="alert">
        {translate(signInError)}
      </Callout>
    );
  }
  if (sessionExpired) {
    return <Callout role="status">{translate("Your session has expired. Please sign in again.")}</Callout>;
  }
  return null;
};

export default SignInNotices;
