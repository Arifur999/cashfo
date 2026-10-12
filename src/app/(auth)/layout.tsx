import AuthShell from "@/components/modules/Auth/AuthShell";
import { getLocale } from "@/lib/i18n/locale";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";

// Sign in, sign up and password reset share one frame, in English or
// Bangla -- before an account exists to keep a language preference on.
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <LocaleProvider initialLocale={await getLocale()}>
      <AuthShell>{children}</AuthShell>
    </LocaleProvider>
  );
}
