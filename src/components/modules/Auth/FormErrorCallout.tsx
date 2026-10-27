"use client";

import { RefreshCw } from "lucide-react";
import Button from "@/components/smartly/Button";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import AuthAlert from "./AuthAlert";
import type { AuthFormError } from "./authFormError";

interface FormErrorCalloutProps {
  // A message, or what useAuthAction() made of a failed call.
  error: AuthFormError | string | null;
  // A next step under the message (a link, a hint).
  children?: React.ReactNode;
}

// The message an action came back with, in the active language when the
// dictionary knows it (backend messages are English keys too), its figures
// in the reader's digits. A page older than the site gets the reload button
// that fixes it.
const FormErrorCallout = ({ error, children }: FormErrorCalloutProps) => {
  const { locale, translate } = useLocale();

  const { message, values, reload } = typeof error === "string" ? { message: error, values: undefined, reload: false } : (error ?? { message: "", values: undefined, reload: false });
  if (!message) {
    return null;
  }
  const filled = values && Object.fromEntries(Object.entries(values).map(([name, value]) => [name, typeof value === "number" ? formatCount(value, locale) : value]));
  return (
    <AuthAlert tone="error">
      <p>{translate(message, filled)}</p>
      {children && <div className="mt-1.5 font-normal">{children}</div>}
      {reload && (
        <Button type="button" variant="secondary" size="sm" className="mt-2.5" onClick={() => window.location.reload()}>
          <RefreshCw />
          {translate("Reload the page")}
        </Button>
      )}
    </AuthAlert>
  );
};

export default FormErrorCallout;
